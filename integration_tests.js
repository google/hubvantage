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
 * This file contains integrations tests for all supported reports
 * in this solution. Tests are separated by implementation: Dynamic and Default.
 * Each test initiates report objects, job objects service class and mocks user
 * input by editing the spreadsheet.
 *
 * TESTS WILL FAIL IF SPREADSHEET IS NOT OPEN OR UNREACHABLE.
 *
 * All unit tests are defined as functions in the integrationTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console.
 * @package
 */
function runIntegrationTest() {
  Assert.runTests(integrationTestObject);
}

/**
 * Definition of integration test configuration parameters.
 * spreadSheetID- spreadsheet to populate with mock user input.
 * adhPrimaryCustomerId- ADH customer ID to run queries on (Test Customer = 1).
 * adhCustomerId- ADH Parent Account Customer Id (optional).
 * bqResultTable- Big Query Destination Table Prefix.
 */
let integrationTestsSettingsObject = {
  spreadSheetID: INTEGRATION_TEST_SHEET_ID,
  adhPrimaryCustomerId: INTEGRATION_TEST_PRIMARY_CUSTOMER_ID,
  adhCustomerId: INTEGRATION_TEST_CUSTOMER_ID,
  bqResultTable: INTEGRATION_TEST_BQ_RESULT_TABLE_PREFIX,
};

/**
 * Auxiliary object to setup spreadsheet before tests and handle parameter
 * readings.
 *
 * All methods are declared as within an object to increase readability. This
 * object serves as a namespace due to GAS limitations.
 */
let IntegrationTestsSetUp = {

  /**
   * Opens configured spreadsheet and set the first sheet as active
   */
  setupSpreadsheet: function() {
    let ss = SpreadsheetApp.openById(
      integrationTestsSettingsObject.spreadSheetID);
    if (!ss || ss.getSheets().length < 1) {
      throw new Error(`Invalid Spreadsheet. The spreadsheet with url ` +
          `https://docs.google.com/spreadsheets/d/` +
          `${integrationTestsSettingsObject.spreadSheetID} should exist and ` +
          `have at least one sheet in it.`);
    }
    SpreadsheetApp.setActiveSpreadsheet(ss);
    ss.setActiveSheet(ss.getSheets()[0]);
  },

  /**
   * deletes all existing spreadsheets and insert a blank one. This is the
   * starting state for integration tests
   */
  resetSpreadSheet: function() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheets = ss.getSheets();
    ss.insertSheet();
    sheets.forEach(sheet => {
      ss.deleteSheet(sheet);
    });
  },
  /**
   * Given a service response originated in ADH, returns the value type as
   * defined within the solution
   *
   * @param {string} paramType
   * @param {string} paramName
   * @return {string} VALUE_TYPE value type as defined within solution
   */
  getParamTypeToDataType: function(paramType, paramName) {
    let isArray = false;
    if (!(typeof paramType === 'string')) {
      paramType = paramType['arrayType']['type'];
      isArray = true;
    }
    switch (paramType) {
      case 'INT64':
        return isArray ? VALUE_TYPE.ARRAY_OF_NUMBERS : VALUE_TYPE.NUMBER;
      case 'STRING':
        return isArray ? VALUE_TYPE.ARRAY_OF_STRINGS : VALUE_TYPE.STRING;
      case 'DATE':
        return VALUE_TYPE.DATE;
      default:
        throw new Error(`The parameter with name: ${paramName} has an ` +
            `unsupported datatype: ${paramType}`);
    }
  },
}

/**
 * Definition of user interface report layout (report tables).
 * optionalFilterTableStartRow - row location of optional filters table.
 * groupingSetTableNumberOfRows - row location of grouping set table.
 * gapRowsBetweenTables - number of rows that serve as a gap between tables.
 * reportParametersStartRow - row location of report parameters table.
 */
let mockUserInputTableLayout = {
  optionalFilterTableStartRow: 35,
  groupingSetTableNumberOfRows: 5,
  gapRowsBetweenTables: 2,
  reportParametersStartRow: 19,
};

/**
 * Auxiliary object to mock user input by editing existing sheet with dummy text
 *
 * all methods are declared as within an object to increase readability. This
 * object serves as a namespace due to GAS limitations.
 */
let MockUserInput = {

  /**
   * Gets existing sheet by name and inserts user input for report parameters:
   * ADH configuration and given report type.
   * @param {string} reportSheetName sheet name containing report UI
   * @param {string} supportedReportType SUPPORTED_REPORTS
   * @param {?Array<null|string>} inputParams: collection of user inputs
   */
  setupAdhConfigAndReportParams: function(reportSheetName, supportedReportType,
    ...inputParams) {
    MockUserInput.setupADHConfig(reportSheetName);
    MockUserInput.writeReportParamsByReportType(reportSheetName,
        supportedReportType, inputParams);
  },

  /**
   * Given a report type mock the associated user input in sheet containing the
   * report form
   * @param {string} reportSheetName sheet name containing report UI
   * @param {string} supportedReportType SUPPORTED_REPORTS
   * @param {?Array<null|string>} inputParams: collection of user inputs
   */
  writeReportParamsByReportType: function(reportSheetName, supportedReportType,
    ...inputParams) {
    switch (supportedReportType) {
      case SUPPORTED_REPORTS.RF_ANALYSIS:
        if (inputParams && inputParams.length > 0) {
          let input = inputParams[0];
          MockUserInput.setupRnFReportParams(reportSheetName, input);
        }
        break;
      case SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS:
        MockUserInput.setupBrandSurveyReportParams(reportSheetName);
        break;
      case SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT:
        if (inputParams && inputParams.length === 1) {
          MockUserInput.setupAudienceSpotlightReportParams(reportSheetName,
            inputParams[0]);
        }
        break;
      case SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS:
        if (inputParams && inputParams.length > 0) {
          let input = inputParams[0];
          MockUserInput.setupBusinessImpactReportParams(reportSheetName, input);
        }
        break;
    }
  },

  /**
   * Sets ADH configuration parameters that are predefined in test settings
   * object
   * @param {string} sheetName sheet name containing report UI
   */
  setupADHConfig: function(sheetName) {
    writeDefaultTextFormat(sheetName, 'B11',
        integrationTestsSettingsObject.adhCustomerId);
    writeDefaultTextFormat(sheetName, 'B12',
        integrationTestsSettingsObject.bqResultTable);
    writeDefaultTextFormat(sheetName, 'B13', '2020-01-13');
    writeDefaultTextFormat(sheetName, 'B14', '2020-01-20');
    writeDefaultTextFormat(sheetName, 'B15',
        integrationTestsSettingsObject.adhPrimaryCustomerId);
  },

  /**
   * Sets Brand Survey report parameters
   * @param {string} sheetName sheet name containing report UI
   */
  setupBrandSurveyReportParams: function(sheetName) {
    let rowNum = mockUserInputTableLayout.reportParametersStartRow;
    let cellVals = [
      '1, 2, 3',
      '1, 2',
      '1, 3, 4',
      '1',
      '1',
      '1'
    ];
    for (let i = 0; i < cellVals.length; i++) {
      writeDefaultTextFormat(sheetName, `B${rowNum + i}`, cellVals[i]);
    }
  },

  /**
   * populates dummy user input to report configuration sheet for dynamic report
   * implementation. Supports empty empty user input for optional filters and
   * grouping set table.
   * @param  {!Sheet} sheet sheet name containing report UI
   * @param  {boolean=} isUserInputEmpty=false optional filters and grouping
   *         table will remain empty if true.
   * @return {number} next entry row location
   */
  setupDefaultDynamicReportParams: function(sheet, isUserInputEmpty = false) {
    let rowNum = mockUserInputTableLayout.reportParametersStartRow;
    //set activity id as query parameter
    writeDefaultTextFormat(sheet.getName(), `B${rowNum}`, '1111');
    //set  grouping name
    rowNum +=  mockUserInputTableLayout.groupingSetTableNumberOfRows;
    writeDefaultTextFormat(sheet.getName(), `B${rowNum}`,'GroupingSetName');

    if (isUserInputEmpty === true) {
      return;
    }

    rowNum += mockUserInputTableLayout.gapRowsBetweenTables;

    let groupingRow = [
      'TrueView',
      'Placement',
      'Contain',
      'TrV',
    ];
    let cellVals = [groupingRow];
    cellVals.forEach(row => {
      for (i = 0; i < row.length; i++) {
        let rowRangeA1Notation = sheet.getRange(rowNum, i + 1, 1, 1)
          .getA1Notation();
        writeDefaultTextFormat(sheet.getName(), rowRangeA1Notation, row[i]);
      }
      rowNum++;
    });

    //set up optional filters
    rowNum = mockUserInputTableLayout.optionalFilterTableStartRow;
    let optionalFilterRow = ['Advertiser Name', 'Contain', 3333];
    for (i = 0; i < optionalFilterRow.length; i++) {
      let rowRangeA1Notation = sheet.getRange(rowNum, i + 1, 1, 1)
        .getA1Notation();
      writeDefaultTextFormat(sheet.getName(), rowRangeA1Notation,
        optionalFilterRow[i]);
    }
    return ++rowNum;
  },

  /**
   * Sets Reach and Frequency report parameters
   * @param {string} sheetName sheet name containing report UI
   * @param {string} dataSourceType CM or DV360 as defined in report object for
   *        dropdown menu in report UI
   * @return {number} next entry row location
   */
  setupRnFReportParams: function(sheetName, dataSourceType) {
    let rowNum = mockUserInputTableLayout.reportParametersStartRow;
    let cellVals = [
      dataSourceType,
      '1, 2',
      '1, 3, 4'
    ];
    for (let i = 0; i < cellVals.length; i++) {
      writeDefaultTextFormat(sheetName, `B${rowNum + i}`, cellVals[i]);
    }
    return ++rowNum;
  },

  /**
   * Sets Audience Spotlight report parameters
   * @param {string} sheetName sheet name containing report UI
   * @param {string} dataSourceType CM or DV360 as defined in report object for
   *        dropdown menu in report UI
   * @return {number} next entry row location
   */
  setupAudienceSpotlightReportParams: function(sheetName, dataSourceType) {
    let rowNum = mockUserInputTableLayout.reportParametersStartRow;
    let cellVals = [
      dataSourceType,
      '1, 2',
      '1, 3, 4',
      '1',
      '1',
      null,
      '1000'
    ];
    for (let i = 0; i < cellVals.length; i++) {
      writeDefaultTextFormat(sheetName, `B${rowNum + i}`, cellVals[i]);
    }
    return ++rowNum;
  },
  /**
   * Sets Business Impact report parameters
   * @param {string} sheetName sheet name containing report UI
   * @param {string} firstPartyDataTableName 1P Conversion Data BQ Table
   * @return {number} next entry row location
   */
  setupBusinessImpactReportParams: function(sheetName, firstPartyDataTableName) {
    let rowNum = mockUserInputTableLayout.reportParametersStartRow;
    let cellVals = [
      '1, 2, 3',
      '1, 2',
      '1, 3, 4',
      firstPartyDataTableName,
      '2020-01-13',
      '2020-01-20',
      '2020-01-20',
      '7'
    ];
    for (let i = 0; i < cellVals.length; i++) {
      writeDefaultTextFormat(sheetName, `B${rowNum + i}`, cellVals[i]);
    }
    return ++rowNum;
  },

  /**
   * Sets Processor sheet table for all default reports (non dynamic
   * implementation): maps sheet's name to report type and marks entry to run
   * on ADH.
   *
   * @param {string} blSheetName
   * @param {string} cmRnfSheetName
   * @param {string} dv360RnFSheetName
   * @param {string} cmAudSpotSheetName
   * @param {string} dv360AudSpotSheetName
   * @param {string} biReportSheetName
   */
  setupProcessorSheet: function(blSheetName, cmRnfSheetName, dv360RnFSheetName,
    cmAudSpotSheetName, dv360AudSpotSheetName, biReportSheetName) {

    let reportTypeToSheetNameMapping = [
      [SUPPORTED_REPORTS.RF_ANALYSIS, cmRnfSheetName],
      [SUPPORTED_REPORTS.RF_ANALYSIS, dv360RnFSheetName],
      [SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS, blSheetName],
      [SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT, cmAudSpotSheetName],
      [SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT, dv360AudSpotSheetName],
      [SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS, biReportSheetName],
    ];

    let sheetStartingLine = 2;
    let sheetLastRow = reportTypeToSheetNameMapping.length + sheetStartingLine;
    for (let i = sheetStartingLine; i < sheetLastRow; i++) {
      let curEntry = reportTypeToSheetNameMapping[i - sheetStartingLine];
      writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `A${i}`, curEntry[0]);
      writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `B${i}`, curEntry[1]);
      writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `C${i}`, 'Yes');
    }
  },

  /**
   * Sets Processor sheet table for all dynamic reports: maps sheet's name to
   * report type and marks entry to run on ADH.
   *
   * @param  {string} supportedQuery SUPPORTED_REPORTS
   * @param  {number} rowNum entry row to write from
   * @param  {!HubVantageService} hvService adh service class
   * @param  {boolean=} isUserInputEmpty=false optional filters and grouping
   *         table will remain empty if true.
   * @return {number} next row to enter user input
   */
  setupDynamicReportSheetByQuery: function(supportedQuery, rowNum, hvService,
    isUserInputEmpty = false) {
    let dynamicReportSheet = hvService.setupReportConfigSheet(
      getDefaultDynamicReport(supportedQuery), supportedQuery, true);

    let reportSheetName = dynamicReportSheet.getName();
    MockUserInput.setupADHConfig(reportSheetName);
    MockUserInput.setupDefaultDynamicReportParams(dynamicReportSheet,
        isUserInputEmpty);

    writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `A${rowNum}`, supportedQuery);
    writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `B${rowNum}`, reportSheetName);
    writeDefaultTextFormat(PROCESSOR_SHEET_NAME, `C${rowNum}`, 'Yes');
    let nextRow = ++rowNum;
    return nextRow;
  },
}

/**
 * Object that defines a list of integration tests to run.
 */
let integrationTestObject = {
  dynamicReportingIntegrationTest_RunAllReports_NoExceptions: function () {
    IntegrationTestsSetUp.setupSpreadsheet();
    IntegrationTestsSetUp.resetSpreadSheet();
    let hvService = new HubVantageService();
    hvService.initProcessor();
    let rowNumInProcessor = 2;
    rowNumInProcessor = MockUserInput.setupDynamicReportSheetByQuery(
      SUPPORTED_REPORTS.REACH_ANALYSIS, rowNumInProcessor, hvService, true);
    rowNumInProcessor = MockUserInput.setupDynamicReportSheetByQuery(
      SUPPORTED_REPORTS.REACH_ANALYSIS, rowNumInProcessor, hvService);
    rowNumInProcessor = MockUserInput.setupDynamicReportSheetByQuery(
      SUPPORTED_REPORTS.FREQUENCY_ANALYSIS, rowNumInProcessor, hvService);
    rowNumInProcessor = MockUserInput.setupDynamicReportSheetByQuery(
      SUPPORTED_REPORTS.OVERLAP_ANALYSIS, rowNumInProcessor, hvService);
    rowNumInProcessor = MockUserInput.setupDynamicReportSheetByQuery(
      SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS, rowNumInProcessor, hvService);
    hvService.runReports();
  },

  nonDynamicReportIntegrationTest_RunAllReports_NoExceptions: function () {
    IntegrationTestsSetUp.setupSpreadsheet();
    IntegrationTestsSetUp.resetSpreadSheet();
    let hvService = new HubVantageService();
    hvService.initProcessor();
    let dv360RnFReportSheet = hvService.setupReportConfigSheet(getRnFReport(),
      SUPPORTED_REPORTS.RF_ANALYSIS);
    let cmRnFReportSheet = hvService.setupReportConfigSheet(getRnFReport(),
      SUPPORTED_REPORTS.RF_ANALYSIS);
    let blReportSheet = hvService.setupReportConfigSheet(
      getBrandLiftAnalysisReport(), SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS);
    let cmAudSpotReportSheet = hvService.setupReportConfigSheet(
      getAudienceSpotlightReport(), SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT);
    let dv360AudSpotReportSheet = hvService.setupReportConfigSheet(
      getAudienceSpotlightReport(), SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT);
    let biReportSheet = hvService.setupReportConfigSheet(
      getBusinessImpactAnalysisReport(),
      SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS);

    MockUserInput.setupAdhConfigAndReportParams(dv360RnFReportSheet.getName(),
      SUPPORTED_REPORTS.RF_ANALYSIS, 'DV360');
    MockUserInput.setupAdhConfigAndReportParams(cmRnFReportSheet.getName(),
      SUPPORTED_REPORTS.RF_ANALYSIS, 'Campaign Manager');
    MockUserInput.setupAdhConfigAndReportParams(blReportSheet.getName(),
      SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS);
    MockUserInput.setupAdhConfigAndReportParams(cmAudSpotReportSheet.getName(),
      SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT, 'Campaign Manager', null);
    MockUserInput.setupAdhConfigAndReportParams(
      dv360AudSpotReportSheet.getName(), SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT,
      'DV360', null);
    MockUserInput.setupAdhConfigAndReportParams(biReportSheet.getName(),
      SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS,
      INTEGRATION_TEST_BQ_RESULT_TABLE_PREFIX);

    MockUserInput.setupProcessorSheet(
      blReportSheet.getName(),
      cmRnFReportSheet.getName(),
      dv360RnFReportSheet.getName(),
      cmAudSpotReportSheet.getName(),
      dv360AudSpotReportSheet.getName(),
      biReportSheet.getName());

    hvService.runReports();
  },
};
