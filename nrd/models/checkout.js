var Database = require('./db');

function Checkout() {
  this.db = new Database();
};

Checkout.prototype.getItemsListing = function(user, callback) {
  this.db.query().
    select(['*']).
    from('next-checkout-items');
  this.db.execute(function(error, result) {
    var itemList = result;
    callback(itemList);
  });
}

module.exports = Checkout;