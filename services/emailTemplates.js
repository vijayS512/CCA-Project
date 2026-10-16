// Responsive, modern HTML email templates for CampusConnect

const baseTemplate = (content, previewText = 'CampusConnect Notification') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CampusConnect</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .body-content { padding: 32px 24px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-success { background-color: #d1fae5; color: #065f46; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-danger { background-color: #fee2e2; color: #991b1b; }
    .details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #6b7280; font-size: 14px; font-weight: 500; }
    .details-val { color: #111827; font-size: 14px; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; text-align: center; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .footer a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🎓 CampusConnect</h1>
      <p>College Event & Room Booking Management</p>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated notification from the CampusConnect Platform.</p>
      <p>&copy; ${new Date().getFullYear()} CampusConnect. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = {
  welcomeEmail: (userName, role) => {
    const content = `
      <h2 style="margin-top:0; color:#111827;">Welcome to CampusConnect, ${userName}!</h2>
      <p>Your account has been successfully created with the role of <strong>${role.toUpperCase()}</strong>.</p>
      <p>With CampusConnect, you can now seamlessly browse and book college lecture halls, labs, auditoriums, and register for campus events, workshops, and hackathons.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.BASE_URL || 'http://localhost:5000'}/dashboard" class="btn">Go to Your Dashboard</a>
      </div>
    `;
    return baseTemplate(content, 'Welcome to CampusConnect');
  },

  bookingStatusUpdateEmail: ({ userName, roomName, date, startTime, endTime, status, adminRemarks }) => {
    let badgeClass = 'badge-warning';
    let statusMsg = 'is currently pending review';
    if (status === 'approved') {
      badgeClass = 'badge-success';
      statusMsg = 'has been <strong>APPROVED</strong>! 🎉';
    } else if (status === 'rejected') {
      badgeClass = 'badge-danger';
      statusMsg = 'has been <strong>REJECTED</strong>.';
    } else if (status === 'cancelled') {
      badgeClass = 'badge-danger';
      statusMsg = 'has been cancelled.';
    }

    const content = `
      <h2 style="margin-top:0; color:#111827;">Booking Status Update</h2>
      <p>Hello ${userName},</p>
      <p>Your room booking request for <strong>${roomName}</strong> ${statusMsg}</p>
      
      <div class="details-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Room:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${roomName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time Slot:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${startTime} - ${endTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Status:</td>
            <td style="padding: 6px 0; text-align: right;"><span class="badge ${badgeClass}">${status}</span></td>
          </tr>
          ${adminRemarks ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Remarks:</td>
            <td style="padding: 6px 0; font-style: italic; text-align: right;">"${adminRemarks}"</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.BASE_URL || 'http://localhost:5000'}/bookings/my-bookings" class="btn">View Booking Details</a>
      </div>
    `;
    return baseTemplate(content, `Booking ${status.toUpperCase()} - ${roomName}`);
  },

  eventTicketEmail: ({ userName, eventTitle, date, startTime, venue, ticketCode, qrCodeDataUrl }) => {
    const content = `
      <h2 style="margin-top:0; color:#111827;">Your Event Pass & Ticket Confirmed! 🎟️</h2>
      <p>Hello ${userName},</p>
      <p>You have successfully registered for <strong>${eventTitle}</strong>. Here is your event pass:</p>
      
      <div class="details-box" style="text-align: center; border: 2px dashed #6366f1;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Ticket Code</div>
        <div style="font-size: 22px; font-weight: 800; color: #4f46e5; margin: 4px 0 12px;">${ticketCode}</div>
        
        ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" style="width: 140px; height: 140px; margin: 0 auto; display: block; border-radius: 8px; border: 1px solid #e5e7eb;" />` : ''}
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; text-align: left;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Event:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date & Time:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${date} at ${startTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Venue:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${venue}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #6b7280;">Please show this ticket code or QR code at the check-in desk upon arrival.</p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.BASE_URL || 'http://localhost:5000'}/events/my-tickets" class="btn">View All My Tickets</a>
      </div>
    `;
    return baseTemplate(content, `Ticket Confirmation: ${eventTitle}`);
  },

  eventReminderEmail: ({ userName, eventTitle, date, startTime, venue }) => {
    const content = `
      <h2 style="margin-top:0; color:#111827;">⏰ Reminder: Your Event is Tomorrow!</h2>
      <p>Hello ${userName},</p>
      <p>This is a quick reminder that <strong>${eventTitle}</strong> is taking place tomorrow!</p>

      <div class="details-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Event:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${startTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Venue:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${venue}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.BASE_URL || 'http://localhost:5000'}/events/my-tickets" class="btn">View Your Ticket</a>
      </div>
    `;
    return baseTemplate(content, `Reminder: ${eventTitle} is tomorrow!`);
  }
};
