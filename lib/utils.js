module.exports = {
  isOneToOneRelation: (relation) => relation instanceof relation.ownerModelClass.BelongsToOneRelation, 
  throwError: function (message) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};
