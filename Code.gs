/**
 * TM Rubber - Task Delegation Google Sheets Sync
 * Developed by Umar Latif
 *
 * NOTE: Replace the FIREBASE_PROJECT_ID with your actual project ID.
 * To get a service account or use the REST API without auth (if permissions allow for internal scripts):
 * Set your Firestore rules to allow read/write from specific service accounts or use an API key.
 * 
 * Here is an architecture outline using the Firestore REST API:
 */

const FIREBASE_PROJECT_ID = 'gen-lang-client-0226548440'; // Replace with your actual ID
const COLLECTION = 'tasks';

// 1. Function to Sync Data FROM Firebase TO Google Sheets
function syncFirestoreToSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (!data.documents) return;
      
      // Clear existing except headers
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 15).clearContent();
      }
      
      const rows = data.documents.map(doc => {
        const fields = doc.fields;
        return [
          doc.name.split('/').pop(), // ID
          fields.area?.stringValue || '',
          fields.task_type?.stringValue || '',
          fields.task?.stringValue || '',
          fields.priority?.stringValue || '',
          fields.assignee?.stringValue || '',
          fields.status?.stringValue || '',
          fields.start_date?.stringValue || '',
          fields.end_date?.stringValue || '',
          fields.progress?.numberValue || 0,
          fields.frequency?.stringValue || '',
          fields.notes?.stringValue || '',
          fields.flag?.stringValue || '',
          fields.feedback?.stringValue || ''
        ];
      });
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
  } catch(e) {
    Logger.log("Error syncing: " + e);
  }
}

// 2. Trigger that runs whenever an edit happens in the sheet
// To make it bi-directional, you'd add:
function onEdit(e) {
  // If the edit is a status update or progress update, push it to Firestore
  // Note: For full bi-directional sync, logic needs to be careful not to create infinite loops
}
