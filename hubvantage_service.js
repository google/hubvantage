/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Service class to manipulate HubVantage sheets and run reports
 */
class HubVantageService {
  /**
   * Create the HV Processor (aka, "overview") sheet
   */
  initProcessor() {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    // set the timezone of spreadsheet to UTC to fix the time problem.
    const newSheet = activeSpreadsheet.insertSheet()
        .setName(PROCESSOR_SHEET_NAME);
    const sheetName = newSheet.getSheetName();

    // Write Column Headers
    writeBoldHeaderBackground(sheetName, 'A1', 'Report Type');
    writeBoldHeaderBackground(sheetName, 'B1', 'Report Config Sheet');
    writeBoldHeaderBackground(sheetName, 'C1', 'Active');

    // Reports column dropdowns (column A)
    const reportsDropDown = getSupportedReportTypes_().map(type => type[0]);
    let dropdownValidationRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(reportsDropDown).setAllowInvalid(false).build();
    newSheet.getRange("A2:A").setDataValidation(dropdownValidationRule);

    // Config Sheet column formatting (Column B)
    newSheet.getRange('B2:B').setNumberFormat('@');

    // Active column dropdowns (Column C)
    let activeValidationRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Yes', 'No']).setAllowInvalid(false).build();
    newSheet.getRange('C2:C').setDataValidation(activeValidationRule);

    newSheet.setColumnWidths(1, 3, 200);
    activeSpreadsheet.setSpreadsheetTimeZone('GMT');
    activeSpreadsheet.setSpreadsheetLocale('EN_GB');
  }

  /**
   * Create the report configuration sheet and renders UI elements
   * @param {!Object} reportConfigObj Report Config object
   * @param {string} reportType SUPPORTED_REPORTS enum value
   * @param {boolean=} isAdvancedReport Signifies that this is an advanced
   *     report (which includes extra sections); it will get special parsing at
   *     run time
   * @return {!Sheet} The newly-created report configuration Sheet
   */
  setupReportConfigSheet(reportConfigObj, reportType,
      isAdvancedReport = false) {
    if (!reportConfigObj) {
      throw new Error('This report type is not supported.');
    }

    let newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
    let templ = new ReportTemplate(reportConfigObj.name,
        newSheet.getSheetName());
    templ.render(reportConfigObj.reportParams,
        reportConfigObj.renderAdditionalSections,
        reportConfigObj.groupingParams, reportConfigObj.optionalFiltersParams);

    newSheet.addDeveloperMetadata(SHEET_LEVEL_REPORT_TYPE_KEY, reportType);
    newSheet.addDeveloperMetadata(
        IS_ADVANCED_REPORT_META_TAG, isAdvancedReport.toString());

    return newSheet;
  }

  /**
   * Run each active report from the Processor Sheet
   * Updates the Processor Sheet with execution statuses
   */
  runReports() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(PROCESSOR_SHEET_NAME);
    let currentRow = 2;
    let allowedCustomerIds = this.getAllowedCustomerIds_();

    while (!sheet.getRange('B' + currentRow).isBlank()) {
      try {
        if (currentRow > 36) {
            throw new Error('LIMIT EXCEEDED! You can run a maximum of 35 ' +
                'reports per customer on Hubvantage.');
        }
        let reportType = readvalue(PROCESSOR_SHEET_NAME, 'A' + currentRow);
        let sheetName = readvalue(PROCESSOR_SHEET_NAME, 'B' + currentRow)
            .trim();
        let isActive = readvalue(PROCESSOR_SHEET_NAME, 'C' + currentRow);
        if (!reportType || !isActive || !sheetName) {
          break;
        }

        let reportConfigObj = getReportConfigObjFromDisplayString_(reportType);
        if (isActive === 'Yes') {
          let generator = new ReportGenerator();
          let isAdvancedReport = this.isAdvancedReporting_(sheetName);
          generator.refreshLastRunJobStatus(sheetName, reportConfigObj);
          generator.run(sheetName, reportConfigObj, allowedCustomerIds,
              isAdvancedReport);

          sheet.getRange('A' + currentRow + ':C' + currentRow)
              .setBackground('white')
              .setNote('Last run time = ' + new Date().toUTCString());
        } else {
          sheet.getRange('A' + currentRow + ':C' + currentRow)
              .setBackground('white')
              .setNote('Skipped at ' + new Date().toUTCString());
        }
      } catch (ex) {
        console.log('Exception while running reports:', ex);
        sheet.getRange('A' + currentRow + ':C' + currentRow)
            .setBackground('firebrick')
            .setNote(`${new Date().toUTCString()} : ${ex}`);
      }
      currentRow += 1;

      // Sleep for 10 seconds between each API call to prevent hitting
      // 10 queries per minute threshold.
      // See https://developers.google.com/ads-data-hub/policies.
      Utilities.sleep(10000);
    }
  }

  /**
   * Checks if report instance (configured on a sheet), is dynamic reporting
   * (advanced reporting)
   * @private
   * @param  {string} reportSheetName Report sheet name
   * @return {boolean} True if report (sheet) is advanced report
   */
  isAdvancedReporting_(reportSheetName) {
    let devMetadata = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(reportSheetName).getDeveloperMetadata();
    let isAdvancedReportMD = devMetadata.find(x =>
        x.getKey() === IS_ADVANCED_REPORT_META_TAG);

    return (isAdvancedReportMD.getValue() === 'true');
  }

  /**
   * Set up trigger for daily report execution.
   * TODO: Confirm that trigger isn't already set so that we don't create
   *     a duplicate
   */
  toggleAutoRefreshOn() {
    let lock = LockService.getDocumentLock();
    let hasLock = lock.tryLock(LOCK_ACQUIRE_TIMEOUT_MS);
    if (!hasLock) {
      throw new Error('Someone was trying to toggle concurrently. ' +
          'Please try again.');
    }

    try {
      let trigger = ScriptApp.newTrigger('runAutoRefreshActivities_')
          .timeBased().everyDays(1).atHour(3).inTimezone('UTC').create();
      // store the trigger ID in document metadata
      PropertiesService.getDocumentProperties()
          .setProperty(AUTO_REFRESH_TRIGGER_ID_KEY, trigger.getUniqueId());
      // store the current spreadsheet ID keyed by the trigger ID. See
      //   setActiveSpreadsheet()
      PropertiesService.getUserProperties().setProperty(
          this.getSpreadsheetIdKeyName_(trigger.getUniqueId()),
          SpreadsheetApp.getActiveSpreadsheet().getId());
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Remove the script's daily report execution trigger
   * The trigger must have been set by the current user
   * @param {string} triggerUId Trigger Unique ID
   */
  toggleAutoRefreshOff(triggerUId) {
    let lock = LockService.getDocumentLock();
    let hasLock = lock.tryLock(LOCK_ACQUIRE_TIMEOUT_MS);
    if (!hasLock) {
      throw new Error('Someone was trying to toggle concurrently. ' +
          'Please try again.');
    }

    let success = false;
    try {
      // remove the current spreadsheet ID from the user properties store
      PropertiesService.getUserProperties().deleteProperty(
          this.getSpreadsheetIdKeyName_(triggerUId));
      // loop through all (project, current user) triggers. If the trigger ID
      // exists then delete it. If the trigger ID doesn't exist then it might
      // have been created by a different user, in which case this user isn't
      // able to see or delete it
      ScriptApp.getProjectTriggers().forEach((trigger) => {
        if (trigger.getUniqueId() === triggerUId) {
          ScriptApp.deleteTrigger(trigger);
          PropertiesService.getDocumentProperties()
              .deleteProperty(AUTO_REFRESH_TRIGGER_ID_KEY);
          success = true;
        }
      });
    } finally {
      lock.releaseLock();
    }

    if (!success) {
      throw new Error('Toggle Off Failed. ' +
          'Only the user who set it on can remove it.');
    }
  }

  /**
   * Run All reports after setting the active spreadsheet based on User Property
   * This is run "out of document" by a time-based trigger. Much of the rest
   * of this add-on relies on the activeSpreadsheet, so this sets that based
   * on the User Properties before running runReports()
   * @param {string} triggerUId Trigger Unique ID
   */
  triggerJob(triggerUId) {
    this.setActiveSpreadsheet(triggerUId);
    this.runReports();
  }

  /**
   * Set the activeSpreadsheet based on the trigger ID (from the
   * user property store)
   * @param {string} triggerUId Trigger Unique ID
   * @return {!SpreadSheet} Active Spreadsheet object
   */
  setActiveSpreadsheet(triggerUId) {
    let spreadSheetId = PropertiesService.getUserProperties()
        .getProperty(this.getSpreadsheetIdKeyName_(triggerUId));
    let ss = SpreadsheetApp.openById(spreadSheetId);
    SpreadsheetApp.setActiveSpreadsheet(ss);
    return ss;
  }

  /**
   * Create a User Properties Key Name from a Trigger Unique ID
   * Spreadsheet IDs are stored in UserProperties keyed by TriggerUID (which
   * is available in the trigger's event object) but the key cannot be numeric.
   * @private
   * @param {string} triggerUId Trigger Unique ID
   * @return {string}
   */
  getSpreadsheetIdKeyName_(triggerUId) {
    return `HV_${triggerUId}`;
  }

  /**
   * Determine if adding a new trigger is possible
   * Each user can only have ~10 time-based triggers associated with the add-on
   * @return {!Array<*>} Tuple (isAllowed, errormMsg)
   */
  isAutoRefreshOnAllowed() {
    if (ScriptApp.getProjectTriggers() >= 10) {
      errorMesg = 'You have set AutoRefresh ON in too many spreadsheets. ' +
          'Please toggle AutoRefresh OFF in some of them and then try again.';

      return [false, errorMesg];
    }

    return [true, ''];
  }

  /**
   * Get the Unique ID for the reports execution trigger for this spreadsheet
   * @return {string} Trigger Unique ID
   */
  getTriggerUId() {
    return PropertiesService.getDocumentProperties()
        .getProperty(AUTO_REFRESH_TRIGGER_ID_KEY);
  }

  /**
   * Get allowed customer IDs from the allowlist trix.
   * @private
   * @return {!Array<number>} Array of allowed customer IDs
   */
  getAllowedCustomerIds_() {
    let customerIds = [];
    if (ENABLE_CUSTOMER_ALLOWLLIST) {
      let sheet = SpreadsheetApp.openById(CUSTOMERS_ALLOWLIST_SHEET_ID)
        .getSheetByName('Customer Allowlist');
      let rowNumber = 3;
      while (!sheet.getRange('A' + rowNumber).isBlank()
        && !sheet.getRange('B' + rowNumber).isBlank()) {
        if (sheet.getRange('C' + rowNumber).getValue() === 'Yes') {
          customerIds.push(sheet.getRange('B' + rowNumber).getValue());
        }
        rowNumber += 1;
      }
    }
    return customerIds;
  }
}
