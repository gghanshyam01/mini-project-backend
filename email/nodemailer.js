const nodemailer = require('nodemailer');
const loginCred = require('./credentials');

const smtpConfig = {
  service: 'Gmail',
  auth: {
    user: loginCred.username,
    pass: loginCred.password
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

const sendEmail = (user, host, protocol) => {
  return user.generateAuthToken('accountActivate', '7d').then(token => {
    return new Promise((resolve, reject) => {
      const email = user.email;
      const adminMailOptions = {
        from: 'Motorhood Mobility Activator <motmobdev@gmail.com>',
        to: 'gghanshyam01@gmail.com',
        subject: 'New User added',
        text: 'text section',
        html: `Dear Admin, <br><br>A new user has registered with the CRM web app.\n
        Below are the details of the new user: \n
        <ul>
            <li>Name: ${user.firstName} ${user.lastName}</li>
            <li>Email ID: ${email}</li>
        </ul>
        <p>Please click on the below link to allow access:</p>
        <br>
        <a href="${protocol}://${host}/activate/${token}" target='_blank'>Activate ${
          user.firstName
        } ${user.lastName}</a>`
      };
      transporter.sendMail(adminMailOptions, (err, res) => {
        if (err) {
          transporter.sendMail(
            {
              from: 'motmobdev@gmail.com',
              to: email,
              subject: 'Could not send account activation mail',
              text: 'Error message',
              html: `Dear ${user.firstName} ${
                user.lastName
              }, we could be able to send account activation mail 
          to admin. <br>Request you to contact the admin.`
            },
            (err, res) => {}
          );
        } else {
          console.log('Mail sent.');
          resolve();
        }
      });
    });
  });
};

module.exports = { sendEmail };
// module.exports.sendEmail = transporter.sendMail(mailOptions, (err, info) => {
//     if (err) {
//         return console.log('Error Occurred: ', err);
//     }
//     console.log('Done');
//     console.log('Info: ', info);
// });
