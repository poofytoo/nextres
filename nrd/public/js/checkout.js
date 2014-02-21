
/**
* Returns a kerberos given the MIT ID, else returns false.
*/
var getUserByID = function(userId, callback) {
  $.post('/checkoutgetid', {id: userId}, function(data){
    callback(data || false);
  });
}

/**
* Returns a list of kerberos given some search letters.
*/
var getCompleteKerberos = function(userString, callback) {
  var output = [];
  $.post('/checkoutgetkerberos', {id: userString}, function(data) {
    callback(data)
  })
  .fail(function(data) {
    callback(['error']);
  });
}
  
/**
* Associates Kerberos to MIT ID
*/

var captureKerberos = function(k, mitID, callback) {
  $.post('/checkoutsavekerberos', {id: k, mitID: mitID}, function(data) {
    callback(k);
  });
}

/**
 * Get status of an item given the barcode
 */
var getItemStatus = function(barcode, callback) {
  $.post('/checkoutitemstatus', {itemBarcode: barcode}, function(data) {
    callback(data)
  });
}

/**
  Check in item given item-barcode
 */
var checkinItem = function(itemBarcode, callback) {
  $.post('/checkinitem', {itemBarcode: itemBarcode}, function(data) {
    callback(data);
  });
}

/**
* Check out item given [userid, item-barcode-id]
*/
var checkoutItem = function(k, itemBarcode, callback) {
  $.post('/checkoutitem', {userKerberos: k, itemBarcode: itemBarcode}, function(data) {
    callback();
  })
  .fail(function(){
    // TODO: Watch for errors
    callback();
  });
}

var toggleScanStatus = function(status) {
  if (status == 'wait') {
    $('.scan-circle')
      .removeClass('go')
      .addClass('wait')
      .find('.st').text('wait');
  } else {
    $('.scan-circle')
      .removeClass('wait')
      .addClass('go')
      .find('.st').text('scan');
  }
}

var eventHandlers = function(){
  $('.hidden-textbox').on('keypress', function(e) {
    $this = $(this);
    if (e.which == 13) {
      switch(state) {
      case 'NEW_INPUT':
        toggleScanStatus('wait');
        if ($this.val().length == 9) {
          getUserByID($this.val(), function(data) {
            toggleScanStatus();
            state = 'ITEM_CHECKOUT';
            if (data) {
              borrowerID = data;
              $('.init').slideUp(200);
              $('.kerberos').text(data);
              $('.checkout-kerberos').slideDown(200);
            } else {
              console.log(data);
            }
          });
        } else {
          checkinItem($this.val(), function(data) {
            toggleScanStatus();
            if (data) {
              $('.feedback-bar')
                .removeClass('fail').addClass('success')
                .text(data + ' has been returned.')
                .slideDown(200)
                .delay(1000)
                .slideUp(400);
            } else {
              $('.feedback-bar')
                .removeClass('success').addClass('fail')
                .text('Invalid Barcode. Please try again.')
                .slideDown(200)
                .delay(1000)
                .slideUp(400);
            }
          });
        }
        break;
      case 'ITEM_CHECKOUT':
        checkoutItem(borrowerID, $this.val(), function(data){
          console.log(data);
        })
        break;
      default:
        // error
      }
      $this.val('');
    } 
  });
}

var state = '';
var borrowerID = '';
var alwaysFocus = function(){};

var init = function(){
  alwaysFocus = setInterval(function(){$('.hidden-textbox').focus()}, 100);
  state = 'NEW_INPUT';
}

$(document).ready(function(){
  $('.hidden-textbox').focus();
  
  eventHandlers();
  init();
});