/* eslint-disable no-param-reassign */
const groupBy = (arrayObject, key) => arrayObject.reduce((rv, x) => {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});

module.exports = groupBy;