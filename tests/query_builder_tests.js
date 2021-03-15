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
 * @fileoverview This file contains unit tests for the queryBuilder object.
 * All unit tests are defined as functions in the queryBuilderTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console
 */
function runOptionalFilterTest() {
  Assert.runTests(queryBuilderTestObject, true);
}

let queryBuilderTestObject = {
  testParseGrouping_state_expectedOutcome: function() {
    let hvService = new HubVantageService();
    let reportConfig = getDefaultDynamicReport('');
    let sheet = hvService.setupReportConfigSheet(
      reportConfig,
      DYNAMIC_QUERIES.FREQUENCY_DISTRIBUTION_ACROSS_CHANNELS,
      true);
    QueryBuilderMockObject.setupADHConfig(sheet.getName());
    QueryBuilderMockObject.setupGroupingsInput(sheet);
    QueryBuilderMockObject.setupOptionalFilterInput(sheet);

    let queryBuilder = new QueryBuilder(sheet, reportConfig,
      DYNAMIC_QUERIES.FREQUENCY_DISTRIBUTION_ACROSS_CHANNELS);
    let queryOutput = queryBuilder.getADHQuery();
    Assert.isNotFalsyValue(queryOutput);
  },
};

let QueryBuilderMockObject = {
  /**
  * writes user input config params into sheet
  * @param {string} sheetName
  */
  setupADHConfig: function(sheetName) {
    let customerId = integrationTestsSettingsObject.adhCustomerId;
    let resultTable = integrationTestsSettingsObject.bqResultTable;
    let parentAccountId = integrationTestsSettingsObject.adhPrimaryCustomerId;
    writeDefaultTextFormat(sheetName, 'B11', customerId);
    writeDefaultTextFormat(sheetName, 'B12', resultTable,);
    writeDefaultTextFormat(sheetName, 'B13', '2020-01-13');
    writeDefaultTextFormat(sheetName, 'B14', '2020-01-20');
    writeDefaultTextFormat(sheetName, 'B15', parentAccountId);
  },

  /**
  * writes user input groupings into sheet
  * @param {!Sheet} sheet
  */
  setupGroupingsInput: function(sheet) {
    writeDefaultTextFormat(sheet.getName(), 'B23', 'GroupingSetName');

    let rowNum = 25;
    let row1 = [
      'TrueView',
      'Placement',
      'Contain',
      'TrV',
      'Placement',
      'Does not contain',
      'GP,--, \',`'
    ];
    let row2 = [
      'Display',
      'Placement ID',
      'Equals',
      '111',
      'Placement ID',
      'Does not equal',
      '111'
    ];

    let cellVals = [row1, row2];
    cellVals.forEach(row => {
      for (i = 0; i < row.length; i++) {
        let rowRangeA1Notation = sheet.getRange(rowNum, i + 1, 1, 1)
          .getA1Notation();
        writeDefaultTextFormat(sheet.getName(), rowRangeA1Notation, row[i]);
      }
      rowNum++;

    });
  },

  /**
  * writes user input optional filters into sheet
  * @param {!Sheet} sheet
  */
  setupOptionalFilterInput: function(sheet) {
    let rowNum = 33;
    let row1 = ['Advertiser ID', 'Contain', 3333];
    let row2 = ['Advertiser Name', 'Contain', 'dddd'];
    let row3 = ['Advertiser ID', 'IN', '123,456'];

    let cellVals = [row1, row2, row3];
    cellVals.forEach(row => {
      for (i = 0; i < row.length; i++) {
        let rowRangeA1Notation = sheet.getRange(rowNum, i + 1, 1, 1)
          .getA1Notation();
        writeDefaultTextFormat(sheet.getName(), rowRangeA1Notation, row[i]);
      }
      rowNum++;

    });
  },

  /**
  * Auxiliary function to remove created sheets.
  */
  reset: function() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheets = ss.getSheets();
    ss.insertSheet();
    sheets.forEach(sheet => {
      ss.deleteSheet(sheet);
    });
  },
};
