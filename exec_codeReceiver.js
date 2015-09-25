/**
 * exec_codeReceiver.js
 * 
 * execute the codeReceiver.js 
 * 
 * Author: Praween AMONTAMAVUT (Hayakawa Laboratory)
 * E-mail: praween@hykwlab.org
 * Create date: 2015-09-25
 */
//'use strict';
var codeReceiver = require('./codeReceiver.js');
var exec = new codeReceiver({redis:{host:"0.0.0.0"}});
//exec.listen(8595);
exec.listen();
