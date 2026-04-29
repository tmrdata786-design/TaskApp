/**
 * TM Rubber - Task Delegation Google Sheets Sync
 * Developed by Umar Latif
 *
 * Requirements:
 * 1. Add the "FirestoreGoogleAppsScript" library to your Apps Script project.
 *    Library ID: 1VUSl4b1r1eoNcRWotZM3e87yH8M23Rz9_a8bXz9uB1RkS2zRbYVv8BZM
 * 2. Set up a Time-driven trigger to run these functions.
 */

const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0440193534",
  clientEmail: "firebase-adminsdk-fbsvc@gen-lang-client-0440193534.iam.gserviceaccount.com",
  // IMPORTANT: For security, do NOT share this private key publicly. 
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCoRkmjt4pUHjz9\nX+lbZYzVJGl92jvS1yexBVPWPPlW0mB57JNdH6z4udwc4w3J6FUERaZUGszJPEwv\noG8tOOjtuGjs9zlfWwD4UQnqln7KWXLPyLHQv+P6Dspqg2tNAiuVrfxiWaghNYGy\nVXeVHaNmm+ps/ZNL5xhBfwT1dObKWpCF+ek52OVWjIfbOk4k8+Ka8JeUYkgaavM+\nnl2bfxBKh6hXgwXeiftyFDIEWOhdYsdlO/o4yfMpAh4Nfr+nuskvlEHc/VmPYdK9\nCqK8VrKmMg+q7RYXcbGpLdR8+YGVwULZ78jlzecQ40MwaE7DCnXSOKqlMVpECGb2\nGSxNMAvxAgMBAAECggEABCY3iqHr90cHmffTeT13y4mqUEAhWYGUqPjIqG+4djuZ\nxWff+lvdmAR9OPkgTeo8rm5JO6mtgwjJmCMMmsDcfYAeljlCYOeNjpHw/KfZWIP8\nIMOCHvOcW34h35599tgm2vn/Ty2Gx8rZ99vDpxmj/dO6ZBWcnDKGlpbbOHI5fqPS\nzrMlYaAKzoau+Oeol/2fq3Haj90rxgPRZjUzAYSxDJs4j0HaeuWMMwB+3F9QFfHo\nanbTnduQkhMQcg+x9oXXNASMp3m9+vqt9guCa2wEJ3FxSlAm2SR0DwqgHFmOuEUS\na50w/9rCe2zAnSuJjEP37n9ytUcos6up8S4RNUszAQKBgQDWgXYKXDYN6HsBEY+D\nWb7V623nAEHBsB2rpNGn7UtqnD/xmvMflzjl4yRni5QU/jAuAp2Piqf9kkVPOdIL\n6ik45KLqfE5S1PWC9j3nmtk3xXyUil3YpAfSthcUCiufVXUov8e24XI7D8iV70oS\nYOdiqrYsBOxzcOK1QddpYTAatQKBgQDI02ngpQO5PayJYzsHrldSOCP0vf27I2Vz\nouSYvDC0rt75gyZvqinwuAPF5gxbaQU8LYLW7aDw5LxooPWRzhMw8ucYpBsm7kdp\nAiGRenNollE+98bRheaDJf2KHaEKhCHaoI3+NTA2bjcvfAZcGQaHW5GC8ll/uRvv\nCSqSOySlzQKBgFkg28o8PF2VDp8IC+iY/rlmJHlKWwg+xGVQi6jJ6X83wz4Bkym6\nLPMgaTz4+yOp5p0Hiy5cf6bWAySDMuqudkhkf+kMk4LJZ+XtqRU1+zG4RiZ2Q75D\nkdiUvoweGbgPyymOXk536H3v9fmOvulaCGqv4hfyR8lDy39jBz2LG3DNAoGBAI6Z\n0Gy7v9Ehggpsc9YYbdjsFFwNLMZddASQflIWD1+9bIcwIXLZGb7ca5FysQOXpyf8\nCRQk2Es1oLOK19UYx3fSg1Zz8PPL7tkZskxi7uAtHLPhrUPKGMy3hTk1oMye1osv\nxqPjkMCVson9P2bWPlSPKNwayoJvJu6tS5VaecNhAoGBAKiERdYY3RVLNROKG2rv\nOg6cz0OIFMPlGeGKfPDvDRe3lDI3rwwIwHrylOyMfOovHOWdMyIpuwa/Hu8DenI1\nzHDp64oAvcM6himBOTlqoil+9TKfgCt1c4qtpEBa4eZYMYsIrYnKGGwrlAOJPjeq\nDiHcMNktx+rUoAZtHV82gR4q\n-----END PRIVATE KEY-----\n"
};

function getFirestore() {
  return FirestoreApp.getFirestore(FIREBASE_CONFIG.clientEmail, FIREBASE_CONFIG.privateKey, FIREBASE_CONFIG.projectId);
}

function syncFirestoreToSheet() {
  const firestore = getFirestore();
  const allTasks = firestore.getDocuments("tasks");
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Tasks');
  
  if (allTasks.length === 0) return;
  
  const headers = ['id', 'task', 'area', 'task_type', 'assignee', 'priority', 'status', 'progress', 'start_date', 'end_date'];
  
  sheet.clear();
  sheet.appendRow(headers);
  
  allTasks.forEach(task => {
    let rowContent = [];
    const idParts = task.name.split('/');
    const docId = idParts[idParts.length - 1];
    
    headers.forEach(header => {
      if (header === "id") {
        rowContent.push(docId);
      } else {
        rowContent.push(task.fields[header] === undefined ? "" : task.fields[header]);
      }
    });
    sheet.appendRow(rowContent);
  });
}
