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
 * Query Builder class processes user's input for grouping set and optional
 * filter tables, constructs the logical dynamic reporting units
 * and translates them into SQL code
 */
class QueryBuilder {
  /**
   * @param  {?Sheet} sheet
   * @param  {?Object} reportConfig report config object
   * @param  {?DYNAMIC_QUERIES} supportedDynamicQuery Enum to map SQL query
   *         template implementation (some report configuration objects support
   *         different query implementations)
   */
  constructor(sheet, reportConfig, supportedDynamicQuery) {
    if (!sheet || !reportConfig || !supportedDynamicQuery) {
      return undefined;
    }
    /** @private @const {!Sheet} */
    this.sheet_ = sheet;
    /** @private {!Map} */
    this.tableMap_ = new Map();
    /** @private {?GroupingSet} */
    this.groupingSet_ = undefined;
    /** @private {?OptionalFilter} */
    this.optionalFilters_ = undefined;
    /** @private {!DYNAMIC_QUERIES} */
    this.dynamicQueryType_ = supportedDynamicQuery;
    /** @private {!Object} DefaultDynamicReport*/
    this.reportConfig_ = reportConfig;
    this.errorsByComponent = new Map();
  }

  /**
   * extracts the sql representation of current supported dynamic query
   * @returns {string}
   */
  getADHQuery() {
    //parse user input and get base query template
    let queryOutput = this.getQueryTemplateByType_(this.dynamicQueryType_);
    if (!queryOutput) {
      return undefined;
    }

    this.collectAndParseUserInput_();
    if (this.groupingSet_ && !this.groupingSet_.isValid()) {
      this.errorsByComponent.set('GroupingSet',
          this.groupingSet_.errorMessages);
    }
    if (!this.optionalFilters_.isValid()) {
      this.errorsByComponent.set(
          'OptionalFilters', this.optionalFilters_.errorMessages);
    }
    //get grouping representation and insert to template. grouping set can be
    // undefined if collections of user input failed
    if (this.groupingSet_) {
      let groupingSetSQL = this.groupingSet_.getQuerySyntaxString() || '';
      //insert grouping code representation
      queryOutput = queryOutput.replace(
        new RegExp(DYNAMIC_REPORTING_GROUPING_TAG, 'g'),
        groupingSetSQL
      );

      //insert grouping set name to query
      queryOutput = queryOutput.replace(
        new RegExp(DYNAMIC_REPORTING_GROUPING_SET_NAME_TAG, 'g'),
        this.groupingSet_.getGroupingSetName()
      );
    }
    //get optional filter representation and insert to template
    if (this.optionalFilters_) {
      let filtersSQL = this.optionalFilters_.getQuerySyntaxString();
      if (!filtersSQL) {
        filtersSQL = '';
      }
      queryOutput = queryOutput.replace(
        new RegExp(DYNAMIC_REPORTING_FILTER_TAG, 'g'),
        filtersSQL
      );
    }
    return queryOutput;
  }

  /**
   * parses raw data into an object representation of a single grouping
   * @param  {!Array<string|number>} rawData Grouping tuple (name, column1,
   *     condition1, value1, column2, condition2, value2)
   * @return {!Grouping}
   * @private
   */
  parseGrouping_(rawData) {
    //set raw data to expression and grouping objects
    let groupingName = rawData[0];
    let expression1 = new QueryExpression(
      rawData[1],
      rawData[2],
      rawData[3],
      this.reportConfig_.groupingParams
    );
    let expression2 = new QueryExpression(
      rawData[4],
      rawData[5],
      rawData[6],
      this.reportConfig_.groupingParams
    );
    return new Grouping(groupingName, expression1, expression2);
  }

  /**
   * parses raw data into an object representation of optional filter set
   * @param  {!Array<Array<string|number>>} rawData Array of queryexpression
   *     tuples (column, condition, value)
   * @return {!OptionalFilter}
   * @private
   */
  parseOptionalFilters_(rawData) {
    //set raw data to expression and optional filter objects
    let expressions = [];
    if (rawData && rawData.length > 0) {
      expressions = rawData.map(filter => new QueryExpression(
        filter[0],
        filter[1],
        filter[2],
        this.reportConfig_.optionalFiltersParams
      ));
    }
    return new OptionalFilter(expressions);
  }

  /**
   * parses raw data into an object representation of a grouping set
   * @param  {!Array<Array<string|number>>} rawData Array of Grouping tuples
   *     (name, column1, condition1, value1, column2, condition2, value2)
   * @return {!Grouping}
   * @private
   */
  parseGroupingSet_(rawData) {
    //create a grouping set with valid expressions
    let groupingArray = [];
    let errors = [];

    rawData.forEach(g => {
      let curGrouping = this.parseGrouping_(g);
      if (curGrouping.isValid()) {
        groupingArray.push(curGrouping);
      } else if (!curGrouping.isEmpty()) {
        // add the Grouping's error messages to our local error array
        errors.push(...curGrouping.errorMessages);
      }
    });

    if (errors.length) {
      this.errorsByComponent.set('Grouping', errors);
    }

    return new GroupingSet(groupingArray, '');
  }

  /**
   * extracts user input using sheet metadata, and parses it into objects and
   * set value to class attributes
   * @private
   */
  collectAndParseUserInput_() {
    //extract table locations based on sheet metadata
    let devMetaData = this.sheet_.getDeveloperMetadata();

    //map and parse existing user input into objects
    if (devMetaData) {
      devMetaData.forEach(kvp => {
        this.tableMap_.set(kvp.getKey(), kvp.getValue());
      });
    }
    if (this.tableMap_.has(REPORT_PARAMS_META_TAG)) {
      this.collectUserInputByTableLocation_(
        this.tableMap_.get(REPORT_PARAMS_META_TAG));
    }
    if (this.tableMap_.has(GROUPING_META_TAG)) {
      let rawData = this.collectUserInputByTableLocation_(
        this.tableMap_.get(GROUPING_META_TAG));
      this.groupingSet_ = this.parseGroupingSet_(rawData);
    }
    if (this.tableMap_.has(OPTIONAL_FILTERS_META_TAG)) {
      let rawData = this.collectUserInputByTableLocation_(
        this.tableMap_.get(OPTIONAL_FILTERS_META_TAG));
      this.optionalFilters_ = this.parseOptionalFilters_(rawData);
    }
  }

  /**
   * extracts report params inputs from sheet
   * @param {string} tableLocation
   * @return {!Array<Arrray<string|number>>} Sheet values
   * @private
   */
  collectUserInputByTableLocation_(tableLocation) {
    return this.sheet_.getRange(tableLocation).getValues();
  }

  /**
   * extracts query template based on dynamic query type
   * @param {!DYNAMIC_QUERIES} supportedDynamicQueryType
   * @return {string}
   * @private
   */
  getQueryTemplateByType_(supportedDynamicQueryType) {
    switch (supportedDynamicQueryType) {
      case DYNAMIC_QUERIES.FREQUENCY_DISTRIBUTION_ACROSS_CHANNELS:
        return REACH_BY_FREQUENCY_AND_MONTH_QUERY_TEMPLATE;
      case DYNAMIC_QUERIES.OPTIMAL_FREQUENCY:
        return OPTIMAL_FREQUENCY_QUERY_TEMPLATE;
      case DYNAMIC_QUERIES.OVERLAP_WITH_GOOGLE_MEDIA:
        return OVERLAP_WITH_GOOGLE_MEDIA_QUERY_TEMPLATE;
      case DYNAMIC_QUERIES.PATH_ANALYSIS:
        return PATHING_ANALYSIS_QUERY_TEMPLATE;
      default:
        return undefined;
    }
  }

  /**
   * checks of query user input has errors
   * @return {boolean}
   */
  isErrorFree() { return (this.errorsByComponent.size === 0); }

  /**
   * constructs a section title and invalid field messages
   * @return {string} Error messages for this query, with applicable headers
   *   and list of errors, all separated by newlines
   */
  getErrorMessages() {
    let groupingSetErrors = this.handleErrorMessageByComponent_(
        'GroupingSet', 'Grouping Set Errors');
    let groupingErrors = this.handleErrorMessageByComponent_(
        'Grouping', 'Grouping Errors');
    let optionalFilterErrors = this.handleErrorMessageByComponent_(
        'OptionalFilters', 'Optional Filters Errors');

    return [].concat(groupingSetErrors, groupingErrors, optionalFilterErrors)
        .join('\n');
  }

  /**
   * extracts array of component title and error messages
   * @param  {string} componentName
   * @param  {string} componentErrorTitle
   * @return {!Array<string>}
   * @private
   */
  handleErrorMessageByComponent_(componentName, componentErrorTitle) {
    let messageArray = [];
    if (this.errorsByComponent.has(componentName)) {
      let groupingSetErrors = this.errorsByComponent.get(componentName);
      messageArray.push(`${componentErrorTitle}:`);
      messageArray.push(...new Set(groupingSetErrors));
    }
    return messageArray;
  }
}
