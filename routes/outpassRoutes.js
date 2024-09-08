// routes/outpassRoutes.js
const express = require('express');
const { Outpass } = require('../models');
const { format } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');
const { v4: jk } = require('uuid');
// const sendAcceptanceEmail = require('../utils/sendAcceptanceEmail'); // Ensure you have this function properly imported
const router = express.Router();

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

router.post('/outpass', async (req, res) => {
  const { name, registernumber, email, year, department, semester, reason } = req.body;

  try {
    const currentUtcTime = new Date();
    const istTime = utcToZonedTime(currentUtcTime, 'Asia/Kolkata');
    const formattedIstTime = format(istTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Kolkata' });
    const outpassId = jk();

    const newOutpass = await Outpass.create({
      id: outpassId,
      name,
      registernumber,
      email,
      year,
      department,
      semester,
      reason,
      current_datetime: formattedIstTime,
      status: 'pending'
    });

    res.status(201).json({ submission: true, outpass: newOutpass });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = await Outpass.findAll();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/history/:registerNo', async (req, res) => {
  const { registerNo } = req.params;

  try {
    const outpasses = await Outpass.findAll({ where: { registernumber: registerNo } });
    res.json(outpasses);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/outpass/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const outpass = await Outpass.findByPk(id);
    if (!outpass) {
      return res.status(404).json({ error: 'Outpass not found' });
    }
    res.json(outpass);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/outpass/:id/accept', async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await Outpass.update({ status: 'HOD Accepted' }, { where: { id } });

    if (updated) {
      const outpass = await Outpass.findByPk(id);
      await sendAcceptanceEmail(outpass.email, id, outpass.name, outpass.registernumber, outpass.department, outpass.year, outpass.semester, outpass.reason);
      res.json({ success: true, email: outpass.email });
    } else {
      res.status(404).json({ success: false, message: 'Outpass not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.post('/outpass/:id/staff-approve', async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await Outpass.update({ status: 'Staff Approved' }, { where: { id } });

    if (updated) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Outpass not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.post('/outpass/:id/staff-decline', async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await Outpass.update({ status: 'Staff Declined' }, { where: { id } });

    if (updated) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Outpass not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
