require('dotenv').config();
const express = require('express');
const { format } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');
const bcrypt=require('bcrypt')
const util = require('util');
const jwt=require('jsonwebtoken')
const cors = require('cors'); 
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const { v4: jk } = require('uuid');
const app = express();
const sqlite3 = require('sqlite3').verbose();


app.use(express.json());
app.use(cors()); 
const PORT = process.env.PORT || 3303;
const corsOptions = {
  origin: ['http://localhost:3000', '*'], // Add your production URL here
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors(corsOptions));

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Could not connect to the database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS outpass (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      registernumber TEXT NOT NULL,
      email TEXT NOT NULL,
      year TEXT NOT NULL,
      department TEXT NOT NULL,
      semester TEXT NOT NULL,
      reason TEXT NOT NULL,
      current_datetime TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `);
});

//kows oda clg
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user:"kingscollegeoutpass@gmail.com",
      pass: "dhym jhij fcwl ulwu",
    },
  });



  const generateDigitalSignature = (studentName) => {
    const secretKey = 'KOWSALYA';
    const signature = crypto.createHmac('sha256', secretKey).update(studentName).digest('hex');
    return signature;
  };

  app.post('/register', (req, res) => {
    const { username, password, user } = req.body;
  
    // Check if the username already exists
    const checkUserQuery = `
      SELECT username FROM login WHERE username = ?;
    `;
  
    db.get(checkUserQuery, [username], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      if (row) {
        // Username already exists
        return res.status(409).json({ error: 'Username already exists' });
      }
  
      // Hash the user's password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        // Insert the user into the SQLite database
        const insertUserQuery = `
          INSERT INTO login (username, password, type)
          VALUES (?, ?, ?);
        `;
  
        db.run(insertUserQuery, [username, hashedPassword, user], function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
  
          res.status(201).json({ id: this.lastID, username, type: user });
        });
      });
    });
  });
  

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);
    
    // Query to get the user from the SQLite database
    const getUserQuery = `SELECT * FROM login WHERE username = ?;`;
  
    db.get(getUserQuery, [username], (err, row) => {
      if (err) {
        console.error('Error retrieving user:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      if (!row) {
        // No user found with the provided username
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Retrieve the stored hashed password from the database
      const storedHashedPassword = row.password;
  
      // Compare the provided password with the stored hashed password using bcrypt
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        if (result) {
          // Passwords match, so create a JWT token
          const userType = row.type;
          const jwtToken = jwt.sign({ username }, "JEEVANKUMAR", { expiresIn: '1h' });
  
          res.status(200).json({ jeevToken: jwtToken, userType: userType, validation: true });
        } else {
          // Passwords do not match
          res.status(401).json({ error: 'Password is incorrect' });
        }
      });
    });
  });
  



  app.get('/history', (req, res) => {
    const historyQuery = `SELECT * FROM outpass`;
  
    db.all(historyQuery, [], (err, rows) => {
      if (err) {
        console.error('Error retrieving history:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      // Send the retrieved rows as a JSON response
      res.json(rows);
    });
  });
  


app.post('/outpass', (req, res) => {
  const { name, registernumber, email, year, department, semester, reason } = req.body;

  // Get current UTC time and convert it to IST
  const currentUtcTime = new Date();
  const istTime = utcToZonedTime(currentUtcTime, 'Asia/Kolkata');
  const formattedIstTime = format(istTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Kolkata' });
  
  // Generate a unique ID for the outpass (assuming jk() is a function that generates a unique ID)
  const outpassId = jk(); 

  // Insert query for SQLite
  const insertQuery = `
    INSERT INTO outpass (id, name, registernumber, email, year, department, semester, reason, current_datetime, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');
  `;

  db.run(insertQuery, [
    outpassId,
    name,
    registernumber,
    email,
    year,
    department,
    semester,
    reason,
    formattedIstTime
  ], function(err) {
    if (err) {
      console.error('Error inserting outpass:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    // The 'this' object contains the last inserted row ID and other metadata
    console.log('Outpass inserted successfully:', { id: this.lastID });
    
    res.status(201).json({ submission: true, outpass: { id: outpassId, name, registernumber, email, year, department, semester, reason, current_datetime: formattedIstTime, status: 'pending' } });
  });
});



app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.get('/history/:registerNo/', async (req, res) => {
  const { registerNo } = req.params;

  try {
    const getOutpass = `
      SELECT
        *
      FROM
        outpass
      WHERE
        registernumber = ?;
    `;

    db.all(getOutpass, [registerNo], (err, rows) => {
      if (err) {
        console.error('Error retrieving outpass history:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error retrieving outpass history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/outpass/:id', (req, res) => {
  const { id } = req.params;
  console.log(id);

  // Use a parameterized query to avoid SQL injection
  const rquery = `SELECT * FROM outpass WHERE id = ?`;

  db.get(rquery, [id], (err, row) => {
    if (err) {
      console.error('Error retrieving outpass:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Outpass not found' });
    }

    // Send the retrieved row as a JSON response
    res.json(row);
  });
});


const sendAcceptanceEmail = async (studentEmail, id, studentName, registerNo,department, year,semester,reason) => {
  const doc = new PDFDocument();

  try {

    doc.font('./fonts/arial.ttf');
    doc.font('./fonts/ARIBL0.ttf');

    const collegeLogoPath = './images/kingslogo.png'; 
    const backgroundImagePath = './images/building.png';
    const backgroundImage = fs.readFileSync(backgroundImagePath);

    const logoImage = fs.readFileSync(collegeLogoPath);
    doc.image(logoImage, 50, 30, { width: 70, y:70 }); 
    doc.image(backgroundImage, 40, 140, { width: 612-80, height: 792-180 ,opacity: 0.1});
    
    doc.moveUp(2)
    doc.fontSize(20).text('KINGS ENGINEERING COLLEGE', { align: 'center',bold: true, y: -30});
    doc.fontSize(14).text('Chennai,Tamilnadu-602117 ', { align: 'center' });
    const lineStartX = 30; // Adjust the X-coordinate as needed
    const lineStartY = doc.y + 30; // Adjust the Y-coordinate to position the line below the text
    const lineEndX = doc.page.width - 30; // Adjust the X-coordinate for the line's end point
    doc.moveTo(lineStartX, lineStartY).lineTo(lineEndX, lineStartY).stroke();
    
    doc.moveDown(5);
    
    doc.fontSize(16).text('OUTPASS DETAILS', { align: 'center', bold: true, color: 'blue' });
    
    const textWidth = doc.widthOfString('OUTPASS DETAILS');
    const textX = (doc.page.width - textWidth) / 2;
    const underlineY = doc.y + 6; // Adjust the Y-coordinate for the underline
    doc.moveTo(textX, underlineY).lineTo(textX + textWidth, underlineY).stroke();
    

    doc.moveDown(2);
    


    const studentNameWidth = doc.widthOfString(`Student Name: ${studentName}`);
    const studentNameX = (doc.page.width - studentNameWidth) / 2.1;

    const istTime = new Date();
    const formattedIstTime = format(istTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Kolkata' });    
    // const acceptanceDateTime = now.toLocaleString();
    // console.log(formattedIstTime)
    
    
    doc.fontSize(20).text(`Student Name : ${studentName}`, studentNameX);
    doc.fontSize(20).text(`Register No : ${registerNo}`);
    doc.fontSize(20).text(`Department : ${department}`);
    doc.fontSize(20).text(`Year : ${year}`);
    doc.fontSize(20).text(`Semester : ${semester}`);
    doc.fontSize(20).text(`Reason: ${reason}`);
    doc.fontSize(20).text(`Date and Time of Acceptance: ${formattedIstTime}`);
    
    doc.moveDown(5);

    // Load the checkmark image
const checkmarkImagePath = './images/tick.png'; // Replace with the actual path to your checkmark image
const checkmarkImage = fs.readFileSync(checkmarkImagePath);

// Calculate the X-coordinate for the checkmark image (centered above the text)
const centerX = doc.page.width / 2;
const checkmarkWidth = 40; // Adjust the width of the checkmark image
const checkmarkX = centerX - checkmarkWidth / 2;

const yPosText = doc.page.height - 30; // Y-coordinate for the text
const yPosCheckmark = yPosText - 180; // Y-coordinate for the checkmark (adjust the value as needed)

// Add the checkmark image above the text
doc.image(checkmarkImage, checkmarkX+20, yPosCheckmark, { width: checkmarkWidth });
doc.image(checkmarkImage, checkmarkX+140, yPosCheckmark, { width: checkmarkWidth });

// Add the "Staff Sign" and "HOD Sign" text
doc.text('Incharger Sign    HOD Sign', { align: 'center', width: doc.page.width - 170, y: yPosText, x: doc.page.width - 110 }); // Adjust the 'x' value as needed


  
    const watermarkText = 'KINGS OUTPASS';

    const watermarkWidth = doc.widthOfString(watermarkText);
    const watermarkHeight = doc.currentLineHeight();
    const watermarkX = (doc.page.width - watermarkWidth) / 3.9;
    const watermarkY = (doc.page.height - watermarkHeight) / 1.5;
   
    const watermarkRotation = -45; // Negative angle for left tilt

    doc.rotate(watermarkRotation, { origin: [watermarkX, watermarkY] })
       .fontSize(45)
       .fillOpacity(0.2)
       .text(watermarkText, watermarkX, watermarkY, { align: 'center'});

    const signature = generateDigitalSignature(studentName);

  doc.fontSize(12).text(`Digital Signature: ${signature}`,{ align: 'center' });

  
  // Determine the available width for both labels
  
// Add these lines after all other content is added

  // Calculate the X-coordinates for both labels to center them
  
  // Set the Y-coordinate for both labels
  
    //    const pdfPath = './outpass_acceptance.pdf'; // Define the file path where you want to save the PDF
    // doc.pipe(fs.createWriteStream(pdfPath)); 
    doc.end();


    const pdfBuffer = await new Promise((resolve, reject) => {
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });


    const mailOptions = {
      from: 'vasavioutpass@gmail.com',
      to: studentEmail,
      subject: 'Outpass Accepted',
      text: `Your outpass with ID ${id} has been accepted.`,
      attachments: [
        {
          filename: 'outpass_acceptance.pdf',
          content: pdfBuffer, 
          contentType: 'application/pdf',
        },
      ],
    };


    const sendMailAsync = util.promisify(transporter.sendMail.bind(transporter));
    await sendMailAsync(mailOptions);


    console.log('Email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};



app.post('/outpass/:id/accept', (req, res) => {
  const id = req.params.id;

  try {
    console.log(`Accepting outpass with ID: ${id}...`);

    const updateQuery = `
      UPDATE outpass
      SET status = 'HOD Accepted'
      WHERE id = ?;
    `;
    
    // Execute the update query
    db.run(updateQuery, [id], function(err) {
      if (err) {
        console.error('Error updating outpass:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while accepting outpass' });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        console.error(`Outpass with ID ${id} not found.`);
        return res.status(404).json({ success: false, message: 'Outpass not found' });
      }

      // Fetch the updated outpass details
      const outpassQuery = `
        SELECT * FROM outpass WHERE id = ?;
      `;

      db.get(outpassQuery, [id], (err, outpass) => {
        if (err) {
          console.error('Error retrieving outpass:', err);
          return res.status(500).json({ success: false, message: 'An error occurred while retrieving outpass' });
        }

        if (!outpass) {
          console.error(`Outpass with ID ${id} not found in the database.`);
          return res.status(404).json({ success: false, message: 'Outpass not found in the database' });
        }

        // Send acceptance email
        sendAcceptanceEmail(outpass.email, id, outpass.name, outpass.registernumber, outpass.department, outpass.year, outpass.semester, outpass.reason)
          .then(() => {
            res.json({ success: true, email: outpass.email });
          })
          .catch((error) => {
            console.error('Error sending acceptance email:', error);
            res.status(500).json({ success: false, message: 'An error occurred while sending acceptance email' });
          });
      });
    });
  } catch (error) {
    console.error('Error accepting outpass:', error);
    res.status(500).json({ success: false, message: 'An error occurred while accepting outpass' });
  }
});




// Staff Approval
app.post('/outpass/:id/staff-approve', (req, res) => {
  const id = req.params.id;

  try {
    // Update staff approval status in the database
    const updateQuery = `
      UPDATE outpass
      SET status = 'Staff Approved'
      WHERE id = ?;
    `;

    db.run(updateQuery, [id], function(err) {
      if (err) {
        console.error('Error approving outpass:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while approving outpass' });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Outpass not found' });
      }

      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error approving outpass:', error);
    res.status(500).json({ success: false, message: 'An error occurred while approving outpass' });
  }
});




// Staff Decline
app.post('/outpass/:id/staff-decline', (req, res) => {
  const id = req.params.id;

  try {
    // Update staff decline status in the database
    const updateQuery = `
      UPDATE outpass
      SET status = 'Staff Declined'
      WHERE id = ?;
    `;

    db.run(updateQuery, [id], function(err) {
      if (err) {
        console.error('Error declining outpass:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while declining outpass' });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Outpass not found' });
      }

      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error declining outpass:', error);
    res.status(500).json({ success: false, message: 'An error occurred while declining outpass' });
  }
});


app.post('/outpass/:id/decline', (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const updateQuery = `
      UPDATE outpass
      SET status = 'HOD Declined'
      WHERE id = ?;
    `;

    db.run(updateQuery, [id], function(err) {
      if (err) {
        console.error('Error declining outpass:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while declining outpass' });
      }

      // Check if any row was updated
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Outpass not found' });
      }

      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error declining outpass:', error);
    res.status(500).json({ success: false, message: 'An error occurred while declining outpass' });
  }
});


module.exports = app;
