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
 * Grouping Set class representing a SQL several groupings of logical expression
 * and name. This unit validates input and parses a logical representation of a
 * grouping set case-where clasue with a default of undefined
 * CASE [where clause as name] ELSE 'Undefined' END groupingSet name
 *
 * If input is invalid an array of error messages is returned
 */
class GroupingSet {
  /**
   * Grouping Set
   * @param  {!Array<!Grouping>} groupings
   * @param  {string=} groupingSetName
   */
  constructor(groupings, groupingSetName = '') {
    this.errorMessages = [];
    let wordRegex = /\w/;
    if (groupingSetName === '') {
      this.name_ = 'custom_group';
    } else if (groupingSetName.toString().match(wordRegex)) {
      /** @private @const {string} */
      this.name_ = groupingSetName.toString();
    }

    if (groupings) {
      /** @private @const {!Array<!Grouping>} */
      this.groupings_ = [];
      groupings.forEach(grouping => {
        if (grouping.isValid()) {
          this.groupings_.push(grouping);
        }
        else if (!grouping.isEmpty()) {
          this.errorMessages.push(grouping.errorMessages);
        }
      });
    }
    /** @private {boolean} */
    this.isValid_ = this.checkValidity_();
  }

  /**
   * returns whether building blocks of this grouping can translate to query
   * language
   * @return {boolean}
   */
  isValid() { return this.isValid_; }

  /**
   * gets grouping set's name
   * @return {string}
   */
  getGroupingSetName() { return this.name_; }

  /**
  * gets query sub groupings in this grouping set
  * @returns {!Array<!QueryExpression>}
  */
  getGroupings() { return this.groupings_; }

  /**
  * translates current grouping set to query syntax
  * @returns {?string}
  */
  getQuerySyntaxString() {
    if (!this.isValid_) return undefined;
    if (!this.groupings_.length) {
      return `'Overall' as ${this.name_},`;
    }

    let groupingsSql = this.groupings_.map(g => g.getQuerySyntaxString());
    return `CASE ${groupingsSql.join(' ')} ELSE 'Undefined' ` +
      `END as ${this.name_},`;
  }

  /**
   * checks if grouping set can translate to valid syntax in query language
   * @private
   * @returns {boolean}
   */
  checkValidity_() {
    //grouping set name can be an empty string
    return ((this.name_ !== undefined) &&
        this.groupings_.every(g => g.isValid()));
  }
}
