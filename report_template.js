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
 * Auxiliary class to render UI for reports
 */
class ReportTemplate {

  /**
  * @param {string} reportName Display Name of report in UI
  * @param {string} sheetName
  */
  constructor(reportName, sheetName) {
    /** @private @const {string} **/
    this.reportName_ = reportName;
    /** @private @const {string} **/
    this.sheetName_ = sheetName;
    /** @private @const {number} **/
    this.reportParamRowNum_ = 19;
  }

  /**
   * Given predefined configuration, renders the UI tables for user input
   * @param  {!Array<!Object>} reportParams
   * @param  {?function()} renderAdditionalSections
   * @param  {?Object} groupingParams
   * @param  {?Object} optionalFiltersParams
   */
  render(reportParams, renderAdditionalSections, groupingParams,
      optionalFiltersParams) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(this.sheetName_);
    if (!sheet) {
      throw new Error(`Cannot find sheet with name : ${this.sheetName_}`);
    }
    this.renderLayout_();
    //render parameters that apply to all reports
    let rowNum = this.renderReportParameters_(sheet, reportParams);
    //predefined function in report object to render additional sections
    if (renderAdditionalSections) {
      rowNum = renderAdditionalSections(this.sheetName_, rowNum + 2,
          HEADER_BG_COLOR, FIELD_BG_COLOR);
    }
    //dynamic reporting: supported grouping features defined in report obj
    if (groupingParams) {
      rowNum = this.renderGroupingSettings_(sheet, rowNum + 2, groupingParams);
    }
    //dynamic reporting: supported filters features defined in report obj
    if (optionalFiltersParams) {
      rowNum =
          this.renderOptionalFilters_(sheet, rowNum + 2, optionalFiltersParams);
    }
    sheet.autoResizeColumn(1);
    sheet.setColumnWidths(2, 10, 300);
  }

  /**
   * Set Sheet UI layout for all sections of report: Header, Execution details,
   * Query configuration and Report Parameters
   * @private
   */
  renderLayout_() {
    this.renderReportHeaderSection_();
    this.renderExecutionDetailsSection_();
    this.renderQueryConfigurationSection_();
    this.renderReportParametersSection_();
  }

  /**
   * writes current report name as title to sheet UI with header text formatting
   * @private
   */
  renderReportHeaderSection_() {
    let title = `Report Type: ${this.reportName_}`;
    writeBoldHeaderBackground(this.sheetName_, 'A1:B1', title);
  }

  /**
   * writes execution fields to sheet UI with header text formatting
   * @private
   */
  renderExecutionDetailsSection_() {
    writeBoldHeaderBackground(this.sheetName_, 'A4:B4', 'Execution Details');
    writeItalicFieldBackground(this.sheetName_, 'A5:B5', 'Last Run Time');
    writeItalicFieldBackground(this.sheetName_, 'A6:B6', 'Last Run Status');
    writeItalicFieldBackground(this.sheetName_, 'A7:B7', 'Alerts');
  }

  /**
   * writes execution fields to sheet UI with header text formatting
   * @private
   */
  renderQueryConfigurationSection_() {
    let dateValidationRule = SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .build();
    let posNumberValidationRule = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThan(0)
        .setAllowInvalid(false)
        .build();

    writeBoldHeaderBackground(this.sheetName_, 'A10:B10',
        'Query Configuration');
    writeItalicFieldBackground(this.sheetName_, 'A11', 'ADH Customer ID');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B11', '', '#',
        posNumberValidationRule);
    writeItalicFieldBackground(this.sheetName_, 'A12',
        'Big Query Destination Table Prefix');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B12', '','@');
    writeItalicFieldBackground(this.sheetName_, 'A13',
        'Analysis Start Date(dd-MM-yyyy)');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B13', '',
        'dd-mm-yyyy', dateValidationRule);
    writeItalicFieldBackground(this.sheetName_, 'A14',
        'Analysis End Date(dd-MM-yyyy)');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B14', '',
        'dd-mm-yyyy', dateValidationRule);
    writeItalicFieldBackground(this.sheetName_, 'A15',
        'Parent Account Customer Id (optional)');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B15', '', '#',
        posNumberValidationRule);
    writeItalicFieldBackground(this.sheetName_, 'A16',
        'Timezone(optional, default=UTC)');
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B16', '', '@');
  }

  /**
   * writes current report parameters section title to sheet UI with header
   * text formatting
   * @private
   */
  renderReportParametersSection_() {
    _writeValue(
        this.sheetName_,
        'A18:B18',
        'Report Parameters',
        'bold',
        10,
        'italic',
        HEADER_BG_COLOR);
  }

  /**
   * For each column A1 notation and display value, represented as a pair in
   * columnSpace,  writes display name in given rowIndex
   * @private
   * @param {number} rowIndex row index to write
   * @param {?Array<?string,?string>} columnSpace (A1 notation location, value)
   */
  insertTableTitleRow_(rowIndex, columnSpace) {
    if(!columnSpace || columnSpace.length === 0){
      return;
    }

    columnSpace.forEach(pair =>
      writeItalicFieldBackground(this.sheetName_, pair[0] + rowIndex, pair[1])
    );
  }

  /**
   * For a given range and set of drop down menu items, populate drop down menu
   * and sets formatting
   * @private
   * @param  {!Range} columnRange column to apply drop down menu
   * @param  {!Array<number,string>} validationValues menu items to display
   */
  setValidationPerTableColumn_(columnRange, validationValues) {
    if (columnRange && validationValues && validationValues.length > 0) {
      setRangeFormatting(columnRange, PARAM_TYPE.DROPDOWN,
          VALUE_TYPE.ARRAY_OF_STRINGS, validationValues);
    }
  }

  /**
   * Write Report parameters from a predefined list, and saves location in
   * developer metadata for later use
   * @private
   * @param {!Sheet} sheet sheet containg report UI
   * @param {!Array<!Object>} reportParams Display, Value and type objects
   * @return {number} new writing location
   */
  renderReportParameters_(sheet, reportParams) {
      let rowNum = this.reportParamRowNum_;
      reportParams.forEach(param => {
        writeItalicFieldBackground(
            this.sheetName_, `A${rowNum}`, param.displayParamName);
        let range = sheet.getRange(`B${rowNum}`);
        setRangeFormatting(range, param.paramType, param.valueType,
            param.values);
        rowNum += 1;
      });
      let tableCells = `B${this.reportParamRowNum_}:B${rowNum}`;
      sheet.addDeveloperMetadata(REPORT_PARAMS_META_TAG, tableCells);
      return rowNum;
  }

  /**
   * Renders the table representing groupings section in report creation.
   * @private
   * @param  {!Sheet} sheet sheet containg report UI
   * @param  {number} rowIndex entry point to write
   * @param  {!Object} groupingParams (Display name, ADH name, ID\Name)
   * @return {number} new writing location
   */
  renderGroupingSettings_(sheet, rowIndex, groupingParams) {
    //set table header columns A to G in current row
    writeBoldHeaderBackground(
        this.sheetName_,
        sheet.getRange(rowIndex, 1, 1, 7).getA1Notation(),
        'Custom Grouping Details');
    rowIndex++;

    //set input field for Set Name
    writeItalicFieldBackground(
        this.sheetName_,
        sheet.getRange(rowIndex, 1).getA1Notation(),
        'Set Name:');
      sheet.addDeveloperMetadata(GROUPING_SET_NAME_META_TAG,
          sheet.getRange(rowIndex, 2).getA1Notation());

    rowIndex++;

    //set header row for table
    const columnSpace = [
      ['A', 'Grouping Name'],
      ['B', 'Filter 1'],
      ['C', 'Condition 1'],
      ['D', 'Value 1'],
      ['E', 'Filter 2 (optional)'],
      ['F', 'Condition 2 (optional)'],
      ['G', 'Value 2 (optional)'],
    ];
    this.insertTableTitleRow_(rowIndex, columnSpace);
    rowIndex++;

    //set validation for totalGrouping rows
    let filterTitles =
      this.getValidationTitles_(groupingParams.groupingFilterTypes);

    let validationColumns = [
      [2, filterTitles], //Column B
      [5, filterTitles], //Column E
      [3, groupingParams.conditionTypes], //Column C
      [6, groupingParams.conditionTypes], //Column F
    ];
    //populate drop down menus for filters and conditions
    validationColumns.forEach(pair => {
      this.setValidationPerTableColumn_(
        sheet.getRange(rowIndex, pair[0], groupingParams.maxUserEntries),
        pair[1]);
    });

    //set borders to table and mark location in metadata
    let tableRange = sheet.getRange(rowIndex, 1, groupingParams.maxUserEntries,
      columnSpace.length);
    tableRange.setBorder(true, true, true, true, true, true);
    sheet.addDeveloperMetadata(GROUPING_META_TAG, tableRange.getA1Notation());

    rowIndex += groupingParams.maxUserEntries;
    //return last row count
    return rowIndex;
  }

  /**
   * Given a text representation of a grouping filter (parameter's display
   * name, ADH representaion, name or ID type) as defined in report config
   * object, return a list of display names representation
   * @private
   * @param  {?Array<!Object>} groupingFilter (Display name, ADH name, ID\Name)
   * @return {!Array<string>} list of filter display name representation
   */
  getValidationTitles_(groupingFilter) {
    return (groupingFilter || []).map(kvp => kvp.displayParamName);
  }

  /**
   * Renders the table representing optional filter section in report creation.
   * @private
   * @param  {!Sheet} sheet sheet containing report UI
   * @param  {number} rowIndex entry point to write
   * @param  {!Object} optionalFiltersParams (Display name, ADH name, ID\Name)
   * @return {number} new writing location
   */
  renderOptionalFilters_(sheet, rowIndex, optionalFiltersParams) {
    //set table header A to C in current row index
    let headerRange = sheet.getRange(rowIndex, 1, 1, 3);
    writeBoldHeaderBackground(
        this.sheetName_,
        headerRange.getA1Notation(),
        'Optional Filters');
    rowIndex++;

    //set column headers
    const columnSpace = [
      ['A', 'Filter Dimension'],
      ['B', 'Filter Condition'],
      ['C', 'Filter Value']];
    this.insertTableTitleRow_(rowIndex, columnSpace);
    rowIndex++;

    let dimensionTitles =
      this.getValidationTitles_(optionalFiltersParams.groupingFilterTypes);

    let validationColumns = [
      [1, dimensionTitles], //column A
      [2, optionalFiltersParams.conditionTypes], //Column B
    ];

    //populate drop down menus dimensions and operators
    validationColumns.forEach(pair => {
      this.setValidationPerTableColumn_(
        sheet.getRange(rowIndex, pair[0], optionalFiltersParams.maxUserEntries),
        pair[1]);
    });

    //set table borders and mark range in meta data
    let tableRange = sheet.getRange(rowIndex, 1,
        optionalFiltersParams.maxUserEntries, columnSpace.length);

    tableRange.setBorder(true, true, true, true, true, true);
    sheet.addDeveloperMetadata(
        OPTIONAL_FILTERS_META_TAG,
        tableRange.getA1Notation());

    rowIndex += optionalFiltersParams.maxUserEntries;
    return rowIndex;
  }

  /**
   * Read query configuration values from UI
   * @return {!Array<string>} parameters inputed by user for API request
   */
  getQueryConfigurationParamVals() {
    let adhCustomerId = readvalue(this.sheetName_, 'B11');
    let bqDestTable = readvalue(this.sheetName_, 'B12');
    let analysisStartDate = readvalue(this.sheetName_, 'B13');
    let analysisEndDate = readvalue(this.sheetName_, 'B14');
    let primaryCustomerId = readvalue(this.sheetName_, 'B15');
    let timezone = readvalue(this.sheetName_, 'B16');
    return [
      adhCustomerId,
      bqDestTable,
      analysisStartDate,
      analysisEndDate,
      primaryCustomerId,
      timezone
    ];
  }

  /**
   * Initializes Query Builder and get query text to run on ADH
   * @param  {string} reportType SUPPORTED_REPORTS enum
   * @param  {string} sheetName Sheet name that contain UI
   * @param  {!Array<string>} reportParamVals user input for report parameters
   * @return {?Array<Object>}
   */
  getAdvancedReportQueryImplementation(reportType, sheetName) {
    let reportSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(sheetName);
    let queryBuilder = new QueryBuilder(
        reportSheet,
        getReportConfigObjFromDisplayString_(reportType),
        getAdvancedQueriesByReportType(reportType));
    let queryBody;
    if (queryBuilder) {
      queryBody = queryBuilder.getADHQuery();

      if (queryBody && queryBuilder.isErrorFree()) {
        return [getAdvancedQueryJob(reportType, queryBody)];
      } else {
        return undefined;
      }
    }
  }

  /**
   * Reads values from sheet following a pre determined list of parameters
   * @param {!Array<!Object>} reportParams Display, Value and type objects
   * @return {!Array<string>}
   */
  getReportParamVals(reportParams) {
    let paramVals = [];
    let rowNum = this.reportParamRowNum_;
    reportParams.forEach(param => {
      let value = readvalue(this.sheetName_, `B${rowNum}`);
      //set report default value if defined and input is empty
      if(!value && param.defaultValue){
        value = param.defaultValue;
      }
      paramVals.push(value);
      rowNum += 1;
    });
    return paramVals;
  }

   /**
   * Writes report execution response details to sheet UI
   * @param {!Date} time Report end time
   * @param {number} statusCode HTTP based error code
   * @param {string} alerts Error messages of running report
   */
  setExecutionDetails(time, statusCode, alerts) {
    let statusStr = this.getStatusStrFromStatusCode_(statusCode);
    writeDefaultTextFormatWithCellFormat(this.sheetName_, 'B5',
        time,'dd-mm-yyyy hh:mm UTC');
    writeItalicFieldBackground(this.sheetName_, 'B6', statusStr);
    writeItalicFieldBackground(this.sheetName_, 'B7', alerts);
    let sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(this.sheetName_);
    sheet.autoResizeColumn(2);
  }

  /**
   * Return corresponding error message to status code
   * @private
   * @param {number} statusCode HTTP based error code
   * @return {string}
   */
  getStatusStrFromStatusCode_(statusCode) {
    switch(statusCode){
      case ADH_JOB_SUCCESS:
        return 'Success';
      case ADH_JOB_FAILURE:
        return 'Failure';
      case ADH_JOB_RUNNING:
        return 'Running';
      default:
        return `ERROR ${statusCode}`;
    }
  }
}
