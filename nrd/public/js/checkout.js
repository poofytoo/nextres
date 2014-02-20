
/**
* Returns a username given the MIT ID, else returns false.
*/
var getUserByID = function(userId, callback) {
  $.post('/checkoutgetid', {id: userId}, function(data){
    console.log(data);
    callback(data || false);
  });
}

/**
* Returns a list of kerberos given some search letters.
*/
var getCompleteKerberos = function(userString, callback) {
  var output = [];
  $.post('/checkoutgetkerberos', {id: userString})
  .done(function(data) {
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
    callback();
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

// Code below this point is unfortunately messy. Good luck, future devs.

// TODO: make this autocomplete generator modular so we can use it in other places
var acSelected = 0;
var state = 'MIT_SCAN';

function arrowSelector(sender, e) {
  if (e.which == 38 || e.which == 40) {
    acSelected += (parseInt(e.which) - 39);
    if (acSelected <= 0){
      acSelected = 0;
      $('.ac-listitem').removeClass('arrow-selected');
      $('#id-to-kerberos').focus();
    } else if ($('.item-' + acSelected).length == 0){
      --acSelected;
    } else {    
      $(document).focus();
      $('.ac-listitem').removeClass('arrow-selected');
      $('.item-' + acSelected).addClass('arrow-selected'); 
    }
  } else if (e.which == 13){
    if (acSelected != 0) {
      captureKerberos($('.item-' + acSelected).text(), $('#id-number-hidden').val(), initiateItemScan);
    } else {
      captureKerberos($('#id-to-kerberos').val(), $('#id-number-hidden').val(), initiateItemScan);
    }
  } else {
    acSelected = 0;
  }
}

var initiateEverything = function() {
  state = 'MIT_SCAN';
  acSelected = 0;
  $('.hidden-textbox').val('');
  $('#id-number').text('');
  $('#item-number').text('');
  $('#id-to-kerberos').val('');
  $('.not-associated').hide();
  $('.checkout-status').hide();
  $('.mit-scan').removeClass('inactive').removeClass('active-noblink').addClass('active');
  $('.item-scan').removeClass('active').removeClass('active-noblink').addClass('inactive');
  $('#id-number-hidden').focus();
}

var initiateItemScan = function(kerberos){
  state = 'ITEM_SCAN';
  $('.mit-scan').removeClass('active').removeClass('active-noblink').addClass('inactive');
  $('#item-number-hidden').focus();
  $('.item-scan').removeClass('inactive').removeClass('active-noblink').addClass('active');
  $('.capture-kerberos').slideUp(400);
  $('.checkout-status').html('Checking out item for: <span class="kerberos-checkout"></span>');
  $('.kerberos-checkout').text(kerberos);
  $('.checkout-status').slideDown(300);
}


var checkin = function() {
  checkinItem($('#item-number-hidden').val(), function(data) {
      $('.checkout-status').html('Item successfully checked in.' +
        '<input onclick="initiateEverything()" type="button" value="Checkout another item"/>');
      finishEverything();
      });
}

var continueCheckout = function() {
  checkoutItem($('.kerberos-checkout').text(), $('#item-number-hidden').val(), function(data) {
      $('.checkout-status').html('Item successfully checked out.' +
        '<input onclick="initiateEverything()" type="button" value="Checkout another item"/>');
      finishEverything();
    });
}

var finishEverything = function() {
  state = 'DONE';
  $('.item-scan').removeClass('active').addClass('inactive');
  $('.ask-checkin').slideUp(400);
}

$(document).ready(function(){
  var blinkingCursor = function(){
    var blink = setInterval(function() {
      $('.blinking-cursor').toggle();
      if (state == 'MIT_SCAN'){
        $('#id-number-hidden').focus();
      } else if (state == 'ITEM_SCAN'){
        $('#item-number-hidden').focus();
      }
    }, 400);
  };

  // TODO: make this autocomplete generator modular so we can use it in other places
  $('#id-to-kerberos-autocomplete-container').css({position: 'relative', overflow: 'visible'})
  $('#id-to-kerberos').on('input', function(e){
    var $this = $(this);
    var kerberosList = getCompleteKerberos($this.val(), function(kerberosList){
      var $this = $('#id-to-kerberos');
      var html = '<ul class="' + $this.attr('id') + '-autocomplete">';
      var c = 1;
      for (i in kerberosList) {
        var kerberos = kerberosList[i];
        var id = $('#id-number-hidden').val();
        html += '<li onclick="captureKerberos(\''+ kerberos +'\', ' + id + ', initiateItemScan)" class="ac-listitem item-'+c+'" id="' + kerberos + '">' + kerberos + '</li>';
        ++c;
      }
      $('.' + $this.attr('id') + '-autocomplete').remove();
      $('#' + $this.attr('id') + '-autocomplete-container').append(html);
    });
  })
  
  $(document).on('keypress input','.hidden-textbox', function(e){
    var id = $(this).attr('id');
    $('#' + id.substring(0, id.length - '-hidden'.length)).text($(this).val());
    if (e.which == 13) {  // enter
      if (state == 'MIT_SCAN') {
        getUserByID($(this).val(), function(result){    
          if (!result){
          // MIT ID not associated with Kerberos
            state = 'NEW_USER';
            $('.mit-scan').removeClass('active').addClass('active-noblink');
            $('.capture-kerberos').slideDown(200, function(){
              $('#id-to-kerberos').focus();
            });
          } else {
            initiateItemScan(result);
          }
        });
      } else if (state == 'ITEM_SCAN') {
        getItemStatus($('#item-number-hidden').val(), function(itemStatus) {
          if (itemStatus) {
            $('.item-scan').removeClass('active').addClass('active-noblink');
            $('#kerberos-checkedout').text(itemStatus);  // show who checked this item out
            $('.ask-checkin').slideDown(200);
            } else {
            // just continue checking out
            continueCheckout();
            }
        });
      }
    }
  });
  
  initiateEverything();
  blinkingCursor();
});
