var socket = io.connect();

$(document).ready(function() {
  var typeId = typeof existingId;
  if (typeof existingId !== 'undefined') {
    console.log(existingId, existingName);
    $('#name-invalid').append('<ul role="alert"><li>Login name already exists</li></ul>');
  }
  if (typeof full !== 'undefined' && full) {
    console.log('Max num of users reached');
    $('#name-invalid').append('<ul role="alert"><li>Maximal number of players reached</li></ul>');
  }
  
  if (typeof start !== 'undefined' && start) {
    console.log('Cannot log in because game already started');
    $('#name-invalid').append('<ul role="alert"><li>Game already started</li></ul>');
  }
});