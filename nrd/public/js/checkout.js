
/**
* Returns a kerberos given the MIT ID, else returns false.
*/
var getUserByID = function(userId, callback) {
  $.post('/findmitid', {mitID: userId}, function(data){
    callback(data.error ? false : data);
  });
}

/**
 * Returns user information with the user's checkout information given MIT ID,
 * else returns false.
 */
var getUserCheckoutData = function(userId, callback) {
  $.post('/usercheckoutdata', {mitID: userId}, function(data) {
    callback(data.error ? false : data);
  });
}

/**
* Returns a list of kerberos given some search letters.
*/
var getCompleteKerberos = function(userString, callback) {
  var output = [];
  $.post('/searchkerberos', {kerberosSearchPattern: userString}, function(data) {
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
  $.post('/savekerberos', {kerberos: k, mitID: mitID}, function(data) {
    callback(data);
  });
}

/**
 * Get item given the barcode, or false
 */
var getItemStatus = function(barcode, callback) {
  $.post('/checkoutitemstatus', {barcode: barcode}, function(data) {
    callback(data.error ? false : data)
  });
}

/**
  Check in item given item-barcode; returns the Item
 */
var checkinItem = function(itemBarcode, callback) {
  $.post('/checkinitem', {barcode: itemBarcode}, function(data) {
    callback(data);
  });
}

/**
* Check out item given [userid, item-barcode-id]; returns the Item
*/
var checkoutItem = function(k, itemBarcode, callback) {
  $.post('/checkoutitem', {kerberos: k, barcode: itemBarcode}, function(data) {
    callback(data);
  })
  .fail(function(data){
    // TODO: Watch for errors
    callback(data);
  });
}

var hasOverdueItems = function(items) {
  for (var i = 0; i < items.length; ++i) {
    if (items[i].overdue) {
      return true;
    }
  }
  return false;
}

var toggleScanStatus = function(status) {
  if (status == 'wait') {
    $('.scan-circle')
      .removeClass()
      .addClass('scan-circle wait')
      .find('.st').text('wait');
  } else if (status == 'type') {
    $('.scan-circle')
      .removeClass()
      .addClass('scan-circle type')
      .find('.st').text('type');
  } else {
    $('.scan-circle')
      .removeClass()
      .addClass('scan-circle go')
      .find('.st').text('scan');
  }
}

var itemReturnedCallback = function(data) {
  toggleScanStatus();
  if (!data.error) {
    console.log('item data: ' + data);
    $('.feedback-bar')
      .stop()
      .removeClass('fail').addClass('success')
      .text(data.name + ' has been returned.')
      .slideDown(200)
      .delay(3000)
      .slideUp(400);
    updateDisplayTable(data);
  } else {
    $('.feedback-bar')
      .stop()
      .removeClass('success').addClass('fail')
      .text(data.error)
      .slideDown(200)
      .delay(3000)
      .slideUp(400);
  }
}

var updateDisplayTable = function(item) {
  var barcode = item.barcode;
  $('#' + barcode + '-borrower').html(item.borrower);
  $('#' + barcode + '-daydiff').html(item.daydiff);
  $('#' + barcode + '-returned').toggle(!!item.borrower);
}

var transitionFromOverride = function() {
  $('.checkout-overdue').stop().slideUp(200);
  $('.overdue-buttons').stop().slideUp(200);
}

var transitionToNewInput = function() {
  state = 'NEW_INPUT';
  $('.init').stop().slideDown(200);
  $('.restart').stop().slideUp(200);
  $('.checkout-kerberos').stop().slideUp(200);
  $('.feedback-bar').stop().slideUp(200);
  $('.hidden-textbox').val('');
  mitID = '';
  borrowerID = '';
}

var transitionToCheckout = function() {
  state = 'ITEM_CHECKOUT';
  $('.init').slideUp(200);
  $('.checkout-kerberos').slideDown(200);
  $('.restart').slideDown(200);
}

var activateState = function() {
  $this = $('.hidden-textbox');
  switch(state) {
  case 'NEW_INPUT':
    if ($this.val() != '') {
      mitID = $this.val(); 
    };
    toggleScanStatus('wait');
    if (mitID.length == 9) {  // deskworker scanner a kerberos ID
      // Check Out Item
      getUserCheckoutData(mitID, function(data) {  // data.kerberos 
        toggleScanStatus();
        if (data && hasOverdueItems(data.items)) {
          state = 'OVERDUE';
          borrowerID = data.kerberos;
          $('.init').slideUp(200);
          $('.kerberos').text(data.kerberos);
          $('.checkout-overdue').slideDown(200);
          $('.overdue-buttons').slideDown(200);
        } else if (data) {
          borrowerID = data.kerberos;
          transitionToCheckout();
        } else {
          // New User
          state = 'NEW_KERBEROS_INPUT';
          toggleScanStatus('type');
          $('.init').slideUp(200);
          $('.first-checkout').slideDown(200);
          $('#submit-kerberos').focus();
          barcodeBoxRelease = true;
        }
      });
    } else {  // deskworker scanned a item ID
      // Return Item
      checkinItem($this.val(), itemReturnedCallback); // data = item json
    }
    break;
  case 'OVERDUE':
    break;
  case 'ITEM_CHECKOUT':
    console.log('itemcheckout');
    toggleScanStatus('wait');
    checkoutItem(borrowerID, $this.val(), function(data){  // data = item json
      toggleScanStatus();
      if (!data.error) {
        $('.feedback-bar')
          .removeClass('fail').addClass('success')
          .stop()
          .slideUp(100)
          .text(data.name + ' checked out! Scan another to continue')
          .slideDown(200)
          .delay(5000)
          .slideUp(400);
        updateDisplayTable(data);
      } else {
        $('.feedback-bar')
          .stop()
          .slideUp(100, function(){
          $(this).removeClass('success').addClass('fail')
          .delay(100)
          .text(data.error)
          .slideDown(200)
          .delay(5000)
          .slideUp(400);
          });
      }
    })
    break;
  default:
    // error
  }
  $this.val('');
}

var eventHandlers = function() {
  $('.hidden-textbox').on('keypress', function(e) {
    $this = $(this);
    if (e.which == 13) {  // press enter key
      if (state !== 'NEW_KERBEROS_INPUT') {
        activateState();
      }
    } 
  });
  
  $('#submit-kerberos').on('keypress', function(e) {
    if (e.which == 13) {  // press enter key
      borrowerID = $(this).val();
      console.log('mit id:' + mitID);
      captureKerberos(borrowerID, mitID, function(data){
        //TODO: Validate that kerberos was valid and correct
        //TODO: Implement autocomplete
        toggleScanStatus();
        barcodeBoxRelease = false;
        $('#submit-kerberos').val('');
        
        $('.first-checkout').slideUp(200);
        state = 'NEW_INPUT';
        activateState();
      });
    }
  });

  $('#override-overdue').on('click', function() {
    transitionFromOverride();
    transitionToCheckout();
  });

  $('#cancel-checkout').on('click', function() {
    transitionFromOverride();
    transitionToNewInput();
  });
  
  $('.restart').on('click', function(){
    console.log('restart');
    transitionToNewInput();
  });

  $('.returned').on('click', function(e) {
    var self = this;
    var parent = $(self).parent();
    var divClass = 'return-yesno';

    if ($(self).is(':checked')) {
      var yes = $('<a>').html('yes').on('click', 
        function(e2) {
          var itemcode = e.target.id;
          itemcode = itemcode.substring(0, itemcode.length-'-returned'.length);
          checkinItem(itemcode, function(data) {
            parent.children().remove('.' + divClass);
            itemReturnedCallback(data);
          });
        });
      var no = $('<a>').html('no').on('click',
        function(e2) {
          parent.children().remove('.' + divClass);
          $(self).show();
        });
      $(self).hide();
      $(self).attr('checked', false);
      parent.append('<div class="' + divClass + '"></div>');
      $('.' + divClass).append(yes).append('&nbsp;&nbsp;').append(no);
    }
  });

  $('.remove').on('click', function(e) {
    var yes = $('<a>').html('yes').on('click',
      function(e2) {
        itemcode = e.target.id;
        itemcode = itemcode.substring(0,itemcode.length-'-remove'.length);
        $.ajax('/removeitem',{data:{barcode:itemcode}, type:"POST"});
        $('#'+itemcode+'-tr').remove();
      }
    );
    var no = $('<a>').html('no').on('click',
      function(e2) { $(e.target).html('X'); }
    );
    $(e.target).html(yes).append('&nbsp;&nbsp;').append(no);
  });
}

var state = '';
var borrowerID = '';
var barcodeBoxFocus = function(){};
var barcodeBoxRelease = false;
var mitID = '';

var init = function(){
  barcodeBoxFocus = setInterval(function(){if (!barcodeBoxRelease) $('.hidden-textbox').focus()}, 100);
  state = 'NEW_INPUT';
}

$(document).ready(function(){
  $('.hidden-textbox').focus();
  
  eventHandlers();
  init();
});
