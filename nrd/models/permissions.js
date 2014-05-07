/*
 * PERMISSIONS API
 *
 * This class contains a list of possible groups and a list of possible
 *   permissions.
 * The matrix GROUP_PERMISSIONS contains instructions on what permissions each
 *   group has. For example, GROUP_PERMISSIONS[4] contains [3, 6, 9], which
 *   - *   means that GROUP 4 (DESKCAPTAIN) has permissions 3, 6, and 9
 *   - *   (VIEW_GUEST_LISTS, CHECKOUT_ITEMS, and MAKE_USERS_DESKWORKERS).
 * The matrix CHANGE_PERMISSIONS contains instructions on what permissions each
 *   group can change. For example, CHANGE_PERMISSIONS[4] contains [0, 2, 4],
 *   which means that GROUP 4 (DESKCAPTAIN) can move any users in group 0, 2,
 *   or 4 to any other group in [0, 2, 4] (USER, DESKWORKER, or DESKCAPTAIN).
 *
 * These groups and permissions shouldn't be changed, but more can be added.
 */

var GROUPS = [
        'USER',  // 0
        'ADMIN',  // 1
        'DESKWORKER',  // 2
        'NEXT-EXEC',  // 3
        'DESKCAPTAIN',  // 4
        ]
var PERMISSIONS = [
        'NULL',  // 0
        'CREATE_USER',  // 1
        'FULL_PERMISSIONS_CONTROL',  // 2
        'VIEW_GUEST_LISTS',  // 3
        'EDIT_MINUTES',  // 4
        'EDIT_RESERVATIONS',  // 5
        'CHECKOUT_ITEMS',  // 6
        'NULL2',  // 7
        'NULL3',  // 8
        'MAKE_USERS_DESKWORKERS',  // 9
        ]
var GROUP_PERMISSIONS = [
  [],  // 0
  [1, 2, 3, 4, 5, 6, 9],  // 1
  [3, 6],  // 2
  [1, 4, 5, 6, 9],  // 3
  [3, 6, 9],  // 4
]
var CHANGE_PERMISSIONS = [
  [],  // 0
  [0, 1, 2, 3, 4],  // 1
  [],  // 2
  [0, 2, 3, 4],  // 3
  [0, 2, 4],  // 4
]

function Permissions() {
  this.GROUPS = GROUPS;
  this.PERMISSIONS = PERMISSIONS;
  this.GROUP_PERMISSIONS = GROUP_PERMISSIONS;
  this.CHANGE_PERMISSIONS = CHANGE_PERMISSIONS;
}

/*
 * Given a group ID (an index of the GROUPS array), returns an object with
 *   attributes corresponding to all permissions of the group.
 * e.g. getPermissions(2) = {'VIEW_GUEST_LISTS': true}
 */
Permissions.prototype.getPermissions = function(group) {
  var permissions = {};
  if (group >= 0 && group < GROUP_PERMISSIONS.length) {
    for (var i = 0; i < GROUP_PERMISSIONS[group].length; i++) {
      permissions[PERMISSIONS[GROUP_PERMISSIONS[group][i]]] = true;
    }
  }
  return permissions;
}

module.exports.Permissions = new Permissions();
