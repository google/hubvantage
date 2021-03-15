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
 * @fileoverview This file contains functions which interact directly with
 * the spreadsheet, mostly the UI menu setup and its functions
 */

/**
 * Spreadsheet Open to set up Hubvantage menu
 * @param {!OpenEvent} e GAS Open Event
 */
function onOpen(e) {
  let ui = SpreadsheetApp.getUi();
  let mainMenu = ui.createAddonMenu();
  mainMenu.addItem('Initiate Processor', 'initProcessor');
  mainMenu.addSeparator();
  let reportsSubmenu = ui.createMenu('Create New Report');
  let supportedReports = getSupportedReportTypes_();
  supportedReports.forEach(report => {
    reportsSubmenu.addItem(report[0], report[1]);
  });
  mainMenu.addSubMenu(reportsSubmenu);

  mainMenu.addSeparator();
  mainMenu.addItem('Run Report(s)', 'runReports');
  mainMenu.addSeparator();
  let advancedSubMenu = ui.createMenu('Advanced');
  advancedSubMenu.addItem('Start/Stop AutoRefresh', 'toggleAutoRefresh');
  advancedSubMenu.addItem('Display Query SQL', 'displayQuery');
  advancedSubMenu.addItem('Reset Timezone & Locale', 'resetTzAndLocale');
  mainMenu.addSubMenu(advancedSubMenu);
  mainMenu.addToUi();
}

/**
 * Menu Callback - Reset the spreadsheet timezone to GMT and locale to EN_GB
 */
function resetTzAndLocale() {
  let activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  activeSpreadsheet.setSpreadsheetTimeZone('GMT');
  activeSpreadsheet.setSpreadsheetLocale('EN_GB');
}

/**
 * Menu Callback - Setup the Processor spreadsheet
 */
function initProcessor() {
  let hvService = new HubVantageService();
  hvService.initProcessor();
  SpreadsheetApp.getUi().alert('HubVantage Processor Sheet has been setup!');
}

/**
 * Menu Callback - Display active sheet's query SQL
 */
function displayQuery() {
  let activeSheet = SpreadsheetApp.getActiveSheet();

  //check report type for active sheet
  let devMetadata = activeSheet.getDeveloperMetadata();
  let reportTypeMD = devMetadata.find(x =>
      x.getKey() === SHEET_LEVEL_REPORT_TYPE_KEY);
  let isAdvancedReportMD = devMetadata.find(x =>
      x.getKey() === IS_ADVANCED_REPORT_META_TAG);

  let message = 'Display Query is not supported for this report';
  if (reportTypeMD && isAdvancedReportMD) {
    let reportType = reportTypeMD.getValue();

    if (isAdvancedReportMD.getValue() === 'false') {
      message = new ReportGenerator().getQueryTextFromActiveSheet(reportType);
    } else {
      message = getAdvancedQueryText_(reportType, activeSheet);
    }
  }

  //display query SQL to user
  let ui = SpreadsheetApp.getUi();
  ui.alert('Generated Query:', message, ui.ButtonSet.OK);
}

/**
 * Get Query Text for advanced query
 * Initiates QueryBuilder and returns valid query or error message describing
 * invalid input
 * @private
 * @param  {string} reportType Report Type Enum value
 * @param  {!Sheet} activeSheet GAS Sheet instance
 * @return {string} Query SQL or error message(s)
 */
function getAdvancedQueryText_(reportType, activeSheet) {
  let queryBuilder = new QueryBuilder(activeSheet,
      getReportConfigObjFromDisplayString_(reportType),
      getAdvancedQueriesByReportType(reportType));

  let message;
  if (queryBuilder) {
    message = queryBuilder.getADHQuery();
    if (!queryBuilder.isErrorFree()) {
      message = queryBuilder.getErrorMessages();
    }
  }

  return message;
}

/**
 * Menu Callback - Run active reports from the Processor Sheet
 */
function runReports() {
  let hvService = new HubVantageService();
  hvService.runReports();
  SpreadsheetApp.getUi().alert('HubVantage has started running the reports ' +
      'in the processor sheet!');
}

/**
 * Menu Callback - Add or remove time trigger
 */
function toggleAutoRefresh() {
  let ui = SpreadsheetApp.getUi();
  let hvService = new HubVantageService();
  let triggerUId = hvService.getTriggerUId();

  let clickedButton;

  if (triggerUId) {
    clickedButton = ui.alert('AutoRefresh is currently ON for this ' +
        'report. Do you wish to switch it OFF?', ui.ButtonSet.YES_NO);
  } else {
    let [autoRefreshOnAllowed, errorMesg] = hvService.isAutoRefreshOnAllowed();
    if (autoRefreshOnAllowed) {
      clickedButton = ui.alert('AutoRefresh is currently OFF for this ' +
          'report. Do you wish to switch it ON?', ui.ButtonSet.YES_NO);
    } else {
      ui.alert(errorMesg);
      return;
    }
  }
  if (clickedButton !== ui.Button.YES) {
    return;
  }

  if (triggerUId) {
    hvService.toggleAutoRefreshOff(triggerUId);
  } else {
    hvService.toggleAutoRefreshOn();
  }
}

/**
 * Trigger Callback -- Run reports based on a triggerUID
 * @param {!TimeDrivenEvent} e Event passed from time-driven trigger
 */
function runAutoRefreshActivities_(e) {
  try {
    let hvService = new HubVantageService();
    hvService.triggerJob(e.triggerUid);
  } catch (ex) {
    console.log('Could not refresh reports', ex);
  }
}
