/* jshint node: true */
'use strict';

var floatRegex = /^[-+]?[0-9]*\.?[0-9]+$/;

module.exports = {
  integer: function coerceInteger(value) {
    var integer = parseInt(value, 10);
    return isNaN(integer) || value != integer.toString() ? undefined : integer;
  },
  number: function coerceFloat(value) {
    var number = parseFloat(value);
    return isNaN(number) || !floatRegex.exec(value.toString())  ? undefined : number;
  },
  date: function coerceDate(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  },
  string: function coerceString(value) {
    return value.toString();
  },
  boolean: function coerceBoolean(value) {
    var string = value.toString().toLowerCase();
    switch(string){
      case "true": case "yes": case "1": return true;
      case "false": case "no": case "0": return false;
      default: return Boolean(string);
    }
  }
};
