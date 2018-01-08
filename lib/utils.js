module.exports = {
  throwError: function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};
