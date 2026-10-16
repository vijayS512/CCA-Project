const cron = require('node-cron');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { sendEmail } = require('../config/mailer');
const { eventReminderEmail } = require('./emailTemplates');
const redisClient = require('../config/redis');

const initCronJobs = () => {
  if (process.env.CRON_ENABLED === 'false') {
    console.log('[Cron] Background jobs are disabled via CRON_ENABLED flag.');
    return;
  }

  console.log('[Cron] Initializing scheduled background jobs...');

  // 1. Every 15 minutes: Auto-complete finished bookings and auto-cancel expired pending bookings
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Complete past approved bookings
      const completedResult = await Booking.updateMany(
        {
          status: 'approved',
          $or: [
            { date: { $lt: todayStr } },
            { date: todayStr, endTime: { $lte: currentTimeStr } }
          ]
        },
        { status: 'completed' }
      );

      // Cancel unreviewed pending bookings that are now in the past
      const expiredPendingResult = await Booking.updateMany(
        {
          status: 'pending',
          $or: [
            { date: { $lt: todayStr } },
            { date: todayStr, startTime: { $lte: currentTimeStr } }
          ]
        },
        {
          status: 'cancelled',
          adminRemarks: 'Auto-cancelled: Booking time elapsed without review.'
        }
      );

      // Update event status to 'completed' for past events
      await Event.updateMany(
        {
          status: 'upcoming',
          date: { $lt: new Date(todayStr) }
        },
        { status: 'completed' }
      );

      // Invalidate cache if anything changed
      if (completedResult.modifiedCount > 0 || expiredPendingResult.modifiedCount > 0) {
        await redisClient.delPattern('rooms:*');
        await redisClient.delPattern('bookings:*');
      }

      console.log(`[Cron Task] Booking lifecycle sweep completed. Marked ${completedResult.modifiedCount} completed, ${expiredPendingResult.modifiedCount} expired.`);
    } catch (err) {
      console.error('[Cron Error] Booking sweep error:', err.message);
    }
  });

  // 2. Daily at 08:00 AM: Send reminder emails for events taking place tomorrow
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[Cron Task] Checking events for tomorrow to send reminders...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
      const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

      const upcomingEvents = await Event.find({
        status: 'upcoming',
        date: { $gte: tomorrowStart, $lte: tomorrowEnd }
      }).populate('room');

      for (const event of upcomingEvents) {
        const registrations = await Registration.find({ event: event._id }).populate('user');
        const venueName = event.room ? `${event.room.name} (${event.room.building})` : event.customVenue || 'Campus Venue';

        for (const reg of registrations) {
          if (reg.user && reg.user.email) {
            // Send email
            await sendEmail({
              to: reg.user.email,
              subject: `Reminder: ${event.title} is tomorrow!`,
              html: eventReminderEmail({
                userName: reg.user.name,
                eventTitle: event.title,
                date: event.date.toDateString(),
                startTime: event.startTime,
                venue: venueName
              })
            });

            // Create in-app notification
            await Notification.create({
              user: reg.user._id,
              title: `Reminder: ${event.title}`,
              message: `Your registered event "${event.title}" is happening tomorrow at ${event.startTime}.`,
              link: `/events/${event._id}`,
              type: 'event_reminder'
            });
          }
        }
      }
      console.log(`[Cron Task] Reminders sent for ${upcomingEvents.length} events.`);
    } catch (err) {
      console.error('[Cron Error] Event reminder error:', err.message);
    }
  });

  console.log('[Cron] All background cron schedules registered successfully.');
};

module.exports = { initCronJobs };
