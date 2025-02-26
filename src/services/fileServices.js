const fs = require('fs');
const parse = require('csv-parser');
const path = require('path');
const fastcsv = require('fast-csv');
const readline = require('readline');
const XLSX = require('xlsx');

const headers = [
  'Owner',
  'Owner Address',
  'Owner City',
  'Owner State',
  'Owner Zip',
  'Owner Decimal Interest',
  'Owner Interest Type',
  'Appraisal Year',
  'Operator Company Name',
  'Lease Name',
  'RRC Lease Number',
  'County/Parish Name',
  'State/Province',
  'DI Basin',
  'API 10',
  'Active Well Count',
  'Lease Description',
  'First Prod Date',
  'Last Prod Date',
  'Cum Prod Oil',
  'Cum Prod Gas',
];

const cleanAndGenerateNewFile = async (res, filePath, websocket) => {
  const selectedHeaders = [
    'offer_id',
    'owner',
    'owner1',
    'owner2',
    'adr1',
    'adr2',
    'city',
    'state',
    'zip',
    'county',
    'valuation',
    'nra',
    'legal',
    'Owner First',
    'Owner Last',
    'Mail Addr',
    'Mail City',
    'Mail State',
    'Mail Zip',
    'Cell-1',
    'Cell-2',
    'Cell-3',
    'Cell-4',
    'Cell-5',
    'Cell-6',
    'Cell-7',
    'Cell-8',
    'Cell-9',
    'Landline1',
    'Landline2',
    'Landline3',
    'Landline4',
    'Landline5',
    'Landline6',
    'Landline7',
    'Landline8',
    'Landline9',
  ];

  const results = [];
  const uniqueData = new Set();

  let offerId = 1;
  const outputFilePath = path.join(
    __dirname,
    '/tmp',
    'processed_output.csv'
  );

  const totalLines = await new Promise((resolve, reject) => {
    let lineCount = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', () => {
      lineCount++;
    });

    rl.on('close', () => {
      resolve(lineCount);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });

  let processedLines = 0;

  fs.createReadStream(filePath, { encoding: 'utf8' })
    .pipe(parse({ headers: headers, skipLines: 1, delimiter: ',', quote: '"' }))
    .on('data', (data) => {
      processedLines++;
      const serializedData = JSON.stringify(data);
      if (!uniqueData.has(serializedData)) {
        if (data['Owner'] && !data['Owner Address']) {
          const correctedData = correctMalformedRow(data, offerId++);
          results.push(correctedData);
        } else {
          const selectedData = {
            offer_id: offerId++,
            owner: data['Owner']?.trim(),
            owner1: data['Owner']?.split(' ')[0]?.trim(),
            owner2: data['Owner']?.split(' ')[1]?.trim(),
            adr1: data['Owner Address']?.trim(),
            adr2: data['Owner Address']?.trim(),
            city: data['Owner City']?.trim(),
            state: data['Owner State']?.trim(),
            zip: data['Owner Zip']?.trim(),
            county: data['County/Parish Name']?.trim(),
            valuation: '',
            nra: '',
            legal: data['Lease Description']?.trim()?.replace(/^"(.*)"$/, '$1'),
            'Owner First': data['Owner']?.split(' ')[0]?.trim(),
            'Owner Last': data['Owner']?.split(' ')[1]?.trim(),
            'Mail Addr': data['Owner Address']?.trim(),
            'Mail City': data['Owner City']?.trim(),
            'Mail State': data['Owner State']?.trim(),
            'Mail Zip': data['Owner Zip']?.trim(),
            'Cell-1': '',
            'Cell-2': '',
            'Cell-3': '',
            'Cell-4': '',
            'Cell-5': '',
            'Cell-6': '',
            'Cell-7': '',
            'Cell-8': '',
            'Cell-9': '',
            Landline1: '',
            Landline2: '',
            Landline3: '',
            Landline4: '',
            Landline5: '',
            Landline6: '',
            Landline7: '',
            Landline8: '',
            Landline9: '',
          };
          results.push(selectedData);
        }
      }
      if (websocket) {
        websocket.send(
          JSON.stringify({
            progress: (processedLines / (totalLines - 1)) * 100,
          })
        );
      }
    })
    .on('end', () => {
      const ws = fs.createWriteStream(outputFilePath);
      fastcsv
        .write(results, { headers: selectedHeaders })
        .pipe(ws)
        .on('finish', () => {
          res.download(outputFilePath, 'processed_output.csv', (err) => {
            if (err) {
              console.error('Error downloading file:', err);
              res.status(500).json({ message: 'Error downloading file' });
            }
          });
        });
    })
    .on('error', (err) => {
      console.error('Error reading file:', err);
      res.status(400).json({ message: 'Error reading file' });
    });
};

const correctMalformedRow = (data, offer_id) => {
  const correctedRow = data['Owner'].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  const owner =
    correctedRow.length === 21
      ? correctedRow[0]
      : correctedRow[0] + correctedRow[1];
  const address = correctedRow[correctedRow.length === 21 ? 1 : 2];
  const city = correctedRow[correctedRow.length === 21 ? 2 : 3];
  const state = correctedRow[correctedRow.length === 21 ? 3 : 4];
  const zip = correctedRow[correctedRow.length === 21 ? 4 : 5];
  const county = correctedRow[correctedRow.length === 21 ? 11 : 12];
  const legal = correctedRow[correctedRow.length === 21 ? 16 : 17];
  return {
    offer_id: offer_id,
    owner,
    owner1: owner.split(' ')[0],
    owner2: owner.split(' ')[1],
    adr1: address,
    adr2: address,
    city,
    state,
    zip,
    county,
    valuation: '',
    nra: '',
    legal,
    'Owner First': correctedRow[0]?.split(' ')[0],
    'Owner Last': correctedRow[0]?.split(' ')[1],
    'Mail Addr': address,
    'Mail City': correctedRow[2],
    'Mail State': correctedRow[3],
    'Mail Zip': correctedRow[4],
    'Cell-1': '',
    'Cell-2': '',
    'Cell-3': '',
    'Cell-4': '',
    'Cell-5': '',
    'Cell-6': '',
    'Cell-7': '',
    'Cell-8': '',
    'Cell-9': '',
    Landline1: '',
    Landline2: '',
    Landline3: '',
    Landline4: '',
    Landline5: '',
    Landline6: '',
    Landline7: '',
    Landline8: '',
    Landline9: '',
  };
};

const validateFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const requiredHeaders = headers;
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    let fileHeaders;

    rl.on('line', (line) => {
      if (lineCount === 0) {
        fileHeaders = line.split(',');
        fileHeaders.map((header, index) => {
          if (requiredHeaders[index]?.trim() !== header?.trim()) {
            return reject(new Error('Headers do not match'));
          }
        });
      }
      lineCount++;
    });

    rl.on('close', () => {
      if (lineCount <= 1) {
        return reject(new Error('No data found in the CSV file'));
      }
      resolve();
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
};

const processExcelFile = async (filePath, res, websocket) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const uniqueRecords = new Set();
    const processedData = jsonData
      .filter((data, index) => {
        if (websocket) {
            websocket.send(
              JSON.stringify({
                progress: (index / (jsonData.length - 1)) * 100,
              })
            );
          }
        const dataKey = JSON.stringify(data);
        if (uniqueRecords.has(dataKey)) {
          return false;
        }
        uniqueRecords.add(dataKey);
        return true;
      })
      .map((data, index) => ({
        offer_id: index + 1,
        owner: data['Owner']?.trim() || '',
        owner1: data['Owner']?.split(' ')[0]?.trim() || '',
        owner2: data['Owner']?.split(' ')[1]?.trim() || '',
        adr1: data['Owner Address']?.trim() || '',
        adr2: data['Owner Address']?.trim() || '',
        city: data['Owner City']?.trim() || '',
        state: data['Owner State']?.trim() || '',
        zip: data['Owner Zip'] || '',
        county: data['County/Parish Name']?.trim() || '',
        valuation: '',
        nra: '',
        legal: data['Lease Description']?.trim()?.replace(/^"(.*)"$/, '$1') || '',
        'Owner First': data['Owner']?.split(' ')[0]?.trim() || '',
        'Owner Last': data['Owner']?.split(' ')[1]?.trim() || '',
        'Mail Addr': data['Owner Address']?.trim() || '',
        'Mail City': data['Owner City']?.trim() || '',
        'Mail State': data['Owner State']?.trim() || '',
        'Mail Zip': data['Owner Zip'] || '',
        'Cell-1': '',
        'Cell-2': '',
        'Cell-3': '',
        'Cell-4': '',
        'Cell-5': '',
        'Cell-6': '',
        'Cell-7': '',
        'Cell-8': '',
        'Cell-9': '',
        Landline1: '',
        Landline2: '',
        Landline3: '',
        Landline4: '',
        Landline5: '',
        Landline6: '',
        Landline7: '',
        Landline8: '',
        Landline9: '',
      }));

    const newWorksheet = XLSX.utils.json_to_sheet(processedData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Processed Data');

    const outputFilePath = path.join(
      __dirname,
      '/tmp',
      'processed_output.xlsx'
    );
    XLSX.writeFile(newWorkbook, outputFilePath);

    res.download(outputFilePath, 'processed_output.xlsx', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        return res.status(500).json({ message: 'Error downloading file' });
      }
    });
  } catch (err) {
    console.error('Error processing Excel file:', err);
    return res.status(500).json({ message: 'Error processing Excel file' });
  }
};

const validateXLSXFile = (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
        if (jsonData.length === 0) {
          return reject(new Error('No data found in the Excel file'));
        }
        const requiredHeaders = headers;
        const fileHeaders = jsonData[0].map((header) => header.trim());
  
        if (requiredHeaders.length !== fileHeaders.length) {
          return reject(new Error('Headers count mismatch'));
        }
  
        for (let i = 0; i < requiredHeaders.length; i++) {
          if (requiredHeaders[i].trim() !== fileHeaders[i]) {
            return reject(new Error('Headers do not match'));
          }
        }
  
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

module.exports = { cleanAndGenerateNewFile, validateFile, processExcelFile, validateXLSXFile };
