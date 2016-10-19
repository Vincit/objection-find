module.exports = {
  isOneToOneRelation: function (relation) {
    return relation instanceof relation.ownerModelClass.BelongsToOneRelation;
  },

  throwError: function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};
