######################################################################
#                                                                    #
# smoog.py                                                           #
#   Easily encrypt files in your git repository.                     #
#   Copyright (c) 2014 Kevin Y. Chen kyc2915@mit.edu                 #
#                                                                    #
# See usage instructions on github:                                  #
#   https://github.com/kevinychen/smoog                              #
#                                                                    #
# Credits to                                                         #
#   git-encrypt project:                                             #
#     https://github.com/shadowhand/git-encrypt                      #
#     Copyright (c) 2011 Woody Gilk woody.gilk@gmail.com             #
#   git-encrypt-init.sh script by Jay Taylor [@jtaylor]              #
#     https://github.com/shadowhand/git-encrypt/blob/develop/        #
#         git-encrypt-init.sh                                        #
#     Most of this code is based on the shell script.                #
#                                                                    #
######################################################################


# CONFIGURATION

# Salt sequence: 16-character hex string. Can be generated with
#   $ python -c "import random; print '%016x' % random.randrange(16 ** 16)"
SALT = '4e2595de6e0929fe'

# Files to be encrypted: list of patterns recognized by gitattributes:
#  https://www.kernel.org/pub/software/scm/git/docs/gitattributes.html.
SENSITIVE_FILES = ['nrd/config.json']


##############################
#                            #
# SMOOG Implementation       #
#                            #
# DO NOT EDIT ANYTHING BELOW #
#                            #
##############################

import sys
import os
import shutil
import random
import getpass
import re
import stat

ME = 'smoog.py'
SMOOG_DIR = '.git/smoog'
GIT_CONFIG = '.git/config'
GIT_ATTRIBUTES = '.git/info/attributes'

def isConfirm(s):
    return s == 'y' or s == 'yes'

def validPass(p):
    return re.match(r'\w+$', p)

# Clean all references to smoog in this git repository
def clean():
    resetPass = len(sys.argv) > 1 and sys.argv[1] == 'reset'
    if resetPass and os.path.exists(SMOOG_DIR):
        print 'Remove {0} (y/n)?'.format(SMOOG_DIR),
        if not isConfirm(raw_input()):
            return False
        shutil.rmtree(SMOOG_DIR)
    if os.path.exists(GIT_ATTRIBUTES):
        os.remove(GIT_ATTRIBUTES)
    return True

# Define filter scripts
SSL_SCRIPTS = {
        'clean_filter_openssl': """#!/usr/bin/env bash
SALT_FIXED={1}
PASS_FIXED={0}
openssl enc -base64 -aes-256-ecb -S $SALT_FIXED -k $PASS_FIXED
""",
        'smudge_filter_openssl': """#!/usr/bin/env bash
PASS_FIXED={0}
openssl enc -d -base64 -aes-256-ecb -k $PASS_FIXED 2> /dev/null || cat
""",
        'diff_filter_openssl': """#!/usr/bin/env bash
PASS_FIXED={0}
openssl enc -d -base64 -aes-256-ecb -k $PASS_FIXED -in "$1" 2> /dev/null || cat "$1"
""",
}

# Git config links to filter scripts
SCRIPT_CONFIG = """[filter "openssl"]
	smudge = {0}/smudge_filter_openssl
	clean = {0}/clean_filter_openssl
[diff "openssl"]
	textconv = {0}/diff_filter_openssl
"""

# Add sensitive files to GIT_ATTRIBUTES
def setAttributes():
    print 'info: initializing file', GIT_ATTRIBUTES
    with open(GIT_ATTRIBUTES, 'w') as fh:
        for sensitiveFile in SENSITIVE_FILES:
            fh.write('{0} filter=openssl diff=openssl\n'.format(sensitiveFile))

# Initialize SMOOG
def init():
    # Prompt user for password.
    password = ''
    while True:
        password = getpass.getpass('Enter passphrase: ')
        if not validPass(password):
            print 'Invalid passphrase.'
            continue
        confirmPassword = getpass.getpass('Confirm passphrase: ')
        if confirmPassword != password:
            print 'Passphrases do not match.'
            continue
        break

    # Initialize SMOOG_DIR
    print 'info: initializing', SMOOG_DIR
    os.mkdir(SMOOG_DIR);
    for filterType in SSL_SCRIPTS:
        filterScriptPath = os.path.join(SMOOG_DIR, filterType)
        with open(filterScriptPath, 'w') as fh:
            fh.write(SSL_SCRIPTS[filterType].format(password, SALT))
        os.chmod(filterScriptPath,
                os.stat(filterScriptPath).st_mode | stat.S_IEXEC)

    # Add ssl scripts to git config
    opensslApplied = False
    with open(GIT_CONFIG, 'r') as fh:
        if 'openssl' in fh.read():
            opensslApplied = True
    if opensslApplied:
        print 'info: openssl filter/diff already configured for this clone'
    else:
        print 'info: applying openssl filter/diff to this clone...'
        with open(GIT_CONFIG, 'a') as fh:
            fh.write(SCRIPT_CONFIG.format(SMOOG_DIR))

# Reset all files except for smoog.py, with decryption enabled
def reset():
    tempLoc = os.path.join(SMOOG_DIR, 'temp')
    os.rename(ME, tempLoc)
    os.system('git reset --hard HEAD')
    os.rename(tempLoc, ME)


# Run SMOOG
if __name__ == '__main__':
    # Ensure that we are running in the root of a git repository.
    if not os.path.exists(GIT_CONFIG):
        print 'fatal: this script can only be run in the root of a git repository'
        exit(1)
    if not clean():
        print 'Initialization script cancelled.'
        exit(1)
    setAttributes()
    if not os.path.exists(SMOOG_DIR):
        init()
        reset()


################################################################################
#
# The MIT License (MIT)
#
# Copyright (c) 2014 Kevin Y. Chen kyc2915@mit.edu
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
################################################################################

