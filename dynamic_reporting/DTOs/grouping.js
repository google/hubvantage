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
 * Grouping class representing a SQL grouping of logical expression and name.
 * This unit validates input and parses expression into where clause SQL syntax
 * and a name: WHERE expression THEN name
 *
 * first expression is mandatory, second is not. if input is invalid an array of
 * error messages is returned
 */
class Grouping {
  /**
   * Query Grouping
   * @constructor
   * @param  {string} name Grouping name
   * @param  {!QueryExpression} queryExpression1 logical representation of
   *         query expression
   * @param  {?QueryExpression} queryExpression2=null logical representation
   *         of query expression
   */
  constructor(name, queryExpression1, queryExpression2 = null) {
    this.errorMessages = [];
    let wordRegex = /\w/;
    if (name === '' || name.toString().match(wordRegex)) {
      /** @private @const {string} **/
      this.name_ = name.toString();
    } else {
      /** @private @const {undefined} **/
      this.name_ = undefined;
      this.errorMessages.push('Invalid or empty grouping name');
    }
    /** @private @const {!Array<!QueryExpression>} **/
    this.expressions_ = [];
    if (queryExpression1) {
      if (queryExpression1.isValid()) {
        this.expressions_.push(queryExpression1);
      }
      else if (!queryExpression1.isEmpty()) {
        this.errorMessages.push(
          queryExpression1.errorMessages.join('\n'));
      }
    }

    //no error handling for second expression since defined as optional
    if (queryExpression2 && queryExpression2.isValid()) {
      this.expressions_.push(queryExpression2);
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
   * gets grouping's name
   * @return {string}
   */
  getName() { return this.name_; }


  /**
   * gets query expressions in this grouping
   * @returns {!Array<!QueryExpression>}
   */
  getExpressions() { return this.expressions_; }

  /**
   * translates current expressions and groupings to query syntax
   * @returns {?string}
   */
  getQuerySyntaxString() {

    if (!this.expressions_.length) {
      return undefined;
    }
    let expSql = this.expressions_.map(e => e.getQuerySyntaxString());
    return `WHEN ${expSql.join(' AND ')} THEN '${this.name_}'`;
  }

  /**
   * checks if grouping can translate to valid syntax in query language
   * @private
   * @returns {boolean}
   */
  checkValidity_() {
    //valid name and at least one valid expression to make grouping valid
    return (this.name_ && this.expressions_.some(expr => expr.isValid()));
  }

  /**
   * checks if both name and expressions are empty
   */
  isEmpty() {
    return (!this.name_ && !this.expressions_.length);
  }
}
