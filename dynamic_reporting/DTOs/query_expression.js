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
 * Query Expression class represents the base unit of sql where clauses. given
 * a filter field, condition, and value constructs the representation in SQL
 * syntax: [filter] [condition] [value]
 *
 * This unit is using a given query configuration (defined per report) to
 * validate this specific permutation of filter, condition and value
 */
class QueryExpression {
  /**
   * Query Expression
   * @param  {string} filter
   * @param  {string} condition SQL_OPERATORS
   * @param  {number|string|!Array<number>} value
   * @param  {?Object} queryConfig groupingParams or optionalFiltersParams as
   *         defined in report config file
   */
  constructor(filter, condition, value, queryConfig) {
    if (!queryConfig ||
        !queryConfig.groupingFilterTypes ||
        !queryConfig.conditionTypes) {
      return undefined;
    }
    /** @private @const {!Map} */
    this.filterMap_ = new Map();

    let groupingFilters = queryConfig.groupingFilterTypes;
    //map text representation to field and field type
    groupingFilters.forEach(kvp => {
      this.filterMap_.set(kvp.displayParamName,
          [kvp.adhFieldRepresentation, kvp.valueType]);
    });
    /** @private @const {!Array<!SQL_OPERATORS>} */
    this.sqlOperators_ = queryConfig.conditionTypes;
    this.errorMessages = [];

    //validate filter exists in supported filters
    if (this.filterMap_.has(filter)) {
      /** @private @const {string} */
      this.filter_ = filter;
    } else {
      /** @private @const {undefined} */
      this.filter_ = undefined;
      this.errorMessages.push('Invalid or empty filter');
    }

    //validate operation exists in supported query operations
    if (this.sqlOperators_.includes(condition)) {
      /** @private @const {!SQL_OPERATORS} */
      this.condition_ = condition;
    } else {
      /** @private @const {undefined} */
      this.condition_ = undefined;
      this.errorMessages.push('Invalid or empty condition');
    }

    if (value && this.filter_ && this.condition_) {
      //Contains condition supports only string filters
      if (this.validStringFilterForConditionContains(
        this.filter_, this.condition_)) {
        /** @private @const {number|string|!Array<number>} */
        this.value_ = value;
      } else {
        this.errorMessages.push('Contains supports names only');
        /** @private @const {number|string|!Array<number>} */
        this.value_ = undefined;
      }
    } else {
      /** @private @const {undefined} */
      this.value_ = undefined;
      this.errorMessages.push('Invalid or empty value');
    }
  }
  /**
   * @param  {string} filter
   * @param  {string} condition
   * @return {boolean}
   */
  validStringFilterForConditionContains(filter, condition) {
    //Contains condition supports only string filters
    let filterValueType = this.filterMap_.get(filter)[1];
    let isContainCondition = (condition == SQL_OPERATORS.CONTAIN) ||
        (condition == SQL_OPERATORS.NOT_CONTAIN);
    if (filterValueType === FIELD_TYPE.ID && isContainCondition) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * checks if entire expression is empty
   * @return {boolean}
   */
  isEmpty() {
    return (!this.filter_ && !this.condition_ && !this.value_)
  }

  /**
   * returns whether building blocks of this expression can translate to
   * query language
   * @return {boolean}
   */
  isValid() { return this.value_ ? true : false; }

  /**
   * return filter text representation
   * @return {string}
   */
  getFilter() { return this.filter_; }

  /**
   * return condition enum representation
   * @return {!SQL_OPERATORS}
   */
  getCondition() { return this.condition_; }

  /**
   * return value set to expression
   * @return {number|string|!Array<number>}
   */
  getValue() { return this.value_; }

  /**
  * translates current expression to query syntax
  * @returns {?string}
  */
  getQuerySyntaxString() {
    if (this.isValid()) {
      let fieldType = this.filterMap_.get(this.filter_)[1];
      return this.getSQLRepresentation_(
        this.value_,
        fieldType,
        this.condition_);
    } else {
      return undefined;
    }
  }

  /**
   * translates raw value to query language syntax by a given field type
   * @private
   * @param  {number|string|!Array<number>} rawValue
   * @param  {!FIELD_TYPE.ID|!FIELD_TYPE.NAME} fieldType
   * @returns {string}
   */
  getValuesByFieldType_(rawValue, fieldType) {
    let valueCollection = [];
    switch (fieldType) {
      case FIELD_TYPE.NAME:
        let valueArray = rawValue.toString().trim().split(',');
        valueArray.forEach(v => valueCollection.push(`\'${v.trim()}\'`));
        break;
      case FIELD_TYPE.ID:
        let nonDigitRegex = /\D+/g;
        let identifiersAsString = rawValue.toString().trim()
          .replace(nonDigitRegex, ' ');
        valueCollection = identifiersAsString.trim().split(' ');
        break;
      default:
        break;
    }
    return valueCollection.join(',');
  }
  /**
   * translate entire expression object to query language
   * @private
   * @param  {number|string|!Array<number>} rawValue
   * @param  {!FIELD_TYPE.ID|!FIELD_TYPE.NAME} fieldType
   * @param  {!SQL_OPERATORS} operatorType
   * @returns {string}
   */
  getSQLRepresentation_(rawValue, fieldType, operatorType) {
    let valueEscaped = rawValue.toString().replace("'", "\\'").trim();
    let valueToAdd = this.getValuesByFieldType_(valueEscaped, fieldType);
    let filter = this.filterMap_.get(this.filter_)[0];

    switch (operatorType) {
      case SQL_OPERATORS.CONTAIN:
        return `${filter} LIKE \'%${valueEscaped}%\'`;
      case SQL_OPERATORS.NOT_CONTAIN:
        return `${filter} NOT LIKE \'%${valueEscaped}%\'`;
      case SQL_OPERATORS.EQUAL:
        if (valueToAdd.includes(',')) {
          return undefined;
        } else {
          return `${filter} = ${valueToAdd}`;
        }
      case SQL_OPERATORS.NOT_EQUAL:
        if (valueToAdd.includes(',')) {
          return undefined;
        } else {
          return `${filter} <> ${valueToAdd}`;
        }
      case SQL_OPERATORS.IN:
        return `${filter} IN (${valueToAdd})`;
      case SQL_OPERATORS.NOT_IN:
        return `${filter} NOT IN (${valueToAdd})`;
      default:
        return '';
    }
  }
}
