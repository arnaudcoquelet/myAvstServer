require('/var/www/myavst/node_modules/date-utils');
var http = require('http');

var fs = require('fs');
var restify = require('/var/www/myavst/node_modules/restify');
var soap = require('/var/www/myavst/node_modules/soap');
var async = require('/var/www/myavst/node_modules/async');

var nodeUserGid = "www-data";
var nodeUserUid = "www-data";
var cfg = {
	wsdl_file: '/var/www/myavst/CXIf.wsdl',
	service_url_path: '/AVST/wsdl',
	service_port: 8081,
	avst_server: '10.118.204.75',
	avst_server_port: 80,
	avst_server_protocol: 'http',

	external_prefix: '9',
	date_format: 'MM/DD/YYYY HH:MI PP',
}


////////////////////////////////////////
//  AVST Soap Functions
////////////////////////////////////////

function soapCreateClient(that)
{
	var err, client;
	var callback = that.listFunctions.shift();
	soap.createClient(that.soapUrl, function(err,client) {callback(err,client,that);} ); 
}

function soapSetClient(err, client, that)
{
	that.client = client;
	var callback = that.listFunctions.shift();
	callback(that);
}


//CXGetVersionInfo
function soapCXGetVersionInfoRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXGetVersionInfo": "" } }, 
										(function(err, result, body){callback(err, result, body, that);})
									  );
	}
}

function soapCXGetVersionInfoResponseCallBack(err,result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.session = result.XMLResponse[0].CXResponse;
		console.log('Version:' + that.session.Version + ' BuildNumber:' + that.session.BuildNumber);
		
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXLogon
function soapCXLogonRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXLogon": {"UserID":that.user, "Password":that.password, "LogonType":11 } } }, 
										(function(err, result, body){callback(err, result, body, that);})
									  );
	}
}

function soapCXLogonResponseCallBack(err,result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.session = result.XMLResponse[0].CXResponse;
		console.log('SessionID:' + that.session.SessionID + ' SessionInstanceID:' + that.session.SessionInstanceID);
		
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXLogoff
function soapCXLogoffRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXLogoff": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID} } }, 
										(function(err, result, body){callback(err, result, body, that);})
									  );
	}
}

function soapCXLogoffResponseCallBack(err,result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.session = result.XMLResponse[0].CXResponse;
		console.log('Logoff');
		
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMBGet
function soapCXMBGetRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMBGet": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, "MBID":that.user } } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMBGetResponseCallBack(err, result, body, that, callback) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.mailBox = result.XMLResponse[0].CXResponse.MB;
		console.log('DisplayName:' + that.mailBox.MBCommon.DisplayName);
		
		that.response = that.mailBox;
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMessageSearch
function soapCXMessageSearchRequestCallBack(that)
{
		if(that.client){
			//var dtNow = (new Date(Date.now()));
			//
			var dt=(new Date.UTC(Date.now())).toFormat("YYYY-MM-DDTHH24:MI:00Z");
			var dt1=(new Date(Date.now())).toFormat("YYYY-MM-DDTHH24:MI:00Z");
			console.log(dt1);

			var callback = that.listFunctions.shift();
			that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": 
													{"CXMessageSearch": 
														{"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, 
														 "StoreType":"local", "Folder" : "New", "Style" : "LIFO", "Count" : 100,
														 "StartTimestamp": "2010-01-01T00:00:00Z", "EndTimestamp": dt,
														 "MsgFields":
														 { 	"MsgID":null, "PermanentMsgID":null, "StoreType":null, "Type":null, "Read":null,
															"SoftDeleted":null, "Priority":null, "DeliveryTimestamp":null,
															"ChangedTimestamp":null, "SenderMBID":null, "SenderRemoteMBID":null, "SenderName":null
														 },
														 "MsgFilters":
														 {
															"Priority":null,
															"VoiceMsgSubTypes": {"VoiceMsgSubType":"Normal"},
															"Types": {"Type" : ["Voice", "Fax"] },
															"Sender": {"MBID":null, "RemoteMBID":null, "EmailAddress":null}
														 }
														}
													}
												}, 
					(function(err, result, body){callback(err, result, body, that);}) );
	}
}

function soapCXMessageSearchResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.msgFieldsListNew = result.XMLResponse[0].CXResponse;
		console.log('Messages:' + that.msgFieldsListNew.Count);
		
		that.response = result.XMLResponse[0].CXResponse;


		//Get all messages PermanentMsgID
		var avstmsgs = that.msgFieldsListNew.MsgFieldsList.MsgFields;
		var totalMsg = avstmsgs ?  (("length" in avstmsgs ) ? avstmsgs.length : 1) : 0;
						
		for(var i=0; i<totalMsg; i++) {
			if(totalMsg >1) {
				that.MessagesID.push(avstmsgs[i].PermanentMsgID);
			}
			else {
				that.MessagesID.push(avstmsgs.PermanentMsgID);
			} 
		}

		that.messageid = that.MessagesID.shift();

		if(! avstmsgs) {
			that.listFunctions.shift();
			that.listFunctions.shift();
		}

		var callback = that.listFunctions.shift();
		callback(that);
	}
}

function soapCXMessageSearchRequestCallBack_New(that)
{
		if(that.client){
			var dt=(new Date(Date.now())).toFormat("YYYY-MM-DDTHH24:MI:00Z");

			var callback = that.listFunctions.shift();
			that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": 
													{"CXMessageSearch": 
														{"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, 
														 "StoreType":"local", "Folder" : "New", "Style" : "LIFO", "Count" : 100,
														 "StartTimestamp": "2010-01-01T00:00:00Z", "EndTimestamp": dt,
														 "MsgFields":
														 { 	"MsgID":null, "PermanentMsgID":null, "StoreType":null, "Type":null, "Read":null,
															"SoftDeleted":null, "Priority":null, "DeliveryTimestamp":null,
															"ChangedTimestamp":null, "SenderMBID":null, "SenderRemoteMBID":null, "SenderName":null
														 },
														 "MsgFilters":
														 {
															"Read":null, "Priority":null,
															"VoiceMsgSubTypes": {"VoiceMsgSubType":"Normal"},
															"Types": {"Type" : ["Voice", "Fax"] },
															"Sender": {"MBID":null, "RemoteMBID":null, "EmailAddress":null}
														 }
														}
													}
												}, 
					(function(err, result, body){callback(err, result, body, that);}) );
	}
}

function soapCXMessageSearchResponseCallBack_New(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.msgFieldsListNew = result.XMLResponse[0].CXResponse;
		console.log('New Messages:' + that.msgFieldsListNew.Count);
		
		that.response = result.XMLResponse[0].CXResponse;


		//Get all messages PermanentMsgID
		var avstmsgs = that.msgFieldsListNew.MsgFieldsList.MsgFields;
		var totalMsg = avstmsgs ?  (("length" in avstmsgs ) ? avstmsgs.length : 1) : 0;
						
		for(var i=0; i<totalMsg; i++) {
			if(totalMsg >1) {
				that.MessagesID.push(avstmsgs[i].PermanentMsgID);
			}
			else {
				that.MessagesID.push(avstmsgs.PermanentMsgID);
			} 
		}

		that.messageid = that.MessagesID.shift();

		if(! avstmsgs) {
			that.listFunctions.shift();
			that.listFunctions.shift();
		}

		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMessageSearch
function soapCXMessageSearchRequestCallBack_Saved(that)
{
	if(that.client){
			var dt=(new Date(Date.now())).toFormat("YYYY-MM-DDTHH24:MI:00Z");

			var callback = that.listFunctions.shift();
			that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": 
													{"CXMessageSearch": 
														{"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, 
														 "StoreType":"local", "Folder" : "Save", "Style" : "LIFO", "Count" : 100,
														 "StartTimestamp": "2010-01-01T00:00:00Z", "EndTimestamp": dt,
														 "MsgFields":
														 { 	"MsgID":null, "PermanentMsgID":null, "StoreType":null, "Type":null, "Read":null,
															"SoftDeleted":null, "Priority":null, "DeliveryTimestamp":null,
															"ChangedTimestamp":null, "SenderMBID":null, "SenderRemoteMBID":null, "SenderName":null
														 },
														 "MsgFilters":
														 {
															"Read":null, "Priority":null,
															"VoiceMsgSubTypes": {"VoiceMsgSubType":"Normal"},
															"Types": {"Type" : ["Voice", "Fax"] },
															"Sender": {"MBID":null, "RemoteMBID":null, "EmailAddress":null}
														 }
														}
													}
												}, 
					(function(err, result, body){callback(err, result, body, that);}) );
	}
}


function soapCXMessageSearchResponseCallBack_Saved(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
																		
		that.msgFieldsListNew = result.XMLResponse[0].CXResponse;
		console.log('Saved Messages:' + that.msgFieldsListNew.Count);
		
		that.response = result.XMLResponse[0].CXResponse;

		//Get all messages PermanentMsgID
		var avstmsgs = that.msgFieldsListNew.MsgFieldsList.MsgFields;
		var totalMsg = avstmsgs ?  (("length" in avstmsgs ) ? avstmsgs.length : 1) : 0;
						
		for(var i=0; i<totalMsg; i++) {
			if(totalMsg >1) {
				that.MessagesID.push(avstmsgs[i].PermanentMsgID);
			}
			else {
				that.MessagesID.push(avstmsgs.PermanentMsgID);
			} 
		}

		that.messageid = that.MessagesID.shift();

		if(! avstmsgs) {
			that.listFunctions.shift();
			that.listFunctions.shift();
		}

		var callback = that.listFunctions.shift();
		callback(that);
	}
}


//CXMailboxPasswordChange
function soapCXMailboxPasswordChangeRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMailboxPasswordChange": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, "Mailbox":that.user, "Password":that.newpassword, "PWFormat":0 } } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMailboxPasswordChangeResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
		console.log('Password updated');

		that.response = "updated";
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMessageGet
function soapCXMessageGetRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMessageGet": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, "PermanentMsgID":that.messageid} } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMessageGetResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
		console.log('Message ' + that.messageid + " retrieved");

		if(that.MessagesID && that.MessagesID.length >0){
			//More Message to fetch
			that.listFunctions.unshift(soapCXMessageGetRequestCallBack, soapCXMessageGetResponseCallBack);
			that.messageid = that.MessagesID.shift();
		}

		that.MessageDetails.push(result.XMLResponse[0].CXResponse);
		
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMessageUpdate
function soapCXMessageUpdateRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();

		//
		//if(that.updateaction)
		//{
		//	swicth(that.updateaction)
		//	{
		//		case "Delete":

		//		break;
		//		case "Read":
		//		break;
		//		default:
		//			console.log("soapCXMessageUpdateRequestCallBack: No ACTION received");
		//		break;
		//	}

		//}

		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMessageUpdate": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, "PermanentMsgID":that.messageid, StoredMessage: that.storedmessage} } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMessageUpdateResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
		console.log('Message ' + that.messageid + " updated");

		that.response = result.XMLResponse[0].CXResponse;
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

//CXMessageRetrieveAttachments
function soapCXMessageRetrieveAttachmentsRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();
		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMessageRetrieveAttachments": {"SessionID": that.session.SessionID, "SessionInstanceID": that.session.SessionInstanceID, "PermanentMsgID":that.messageid} } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMessageRetrieveAttachmentsResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
		console.log('Message Attachments');

		that.response = result.XMLResponse[0].CXResponse;
		var callback = that.listFunctions.shift();
		callback(that);
	}
}


//CXMessageSend
function soapCXMessageSendRequestCallBack(that)
{
	if(that.client){
		var callback = that.listFunctions.shift();

		var msgdata = {};
		msgdata["SessionID"] = that.session.SessionID;
		msgdata["SessionInstanceID"] = that.session.SessionInstanceID;
		msgdata["SendType"] = that.SendType;

		//Get Message Details
		if(that.MessageDetails)
		{
			var msg = (that.MessageDetails.length >0 ) ? that.MessageDetails[0].StoredMessage.Message : null;

			if(that.SendType = "Forward"){
				var attachment = that.MessageDetails[0].StoredMessage.Message.Attachments;
				msgdata["Message"] = {"Type":msg.Type, "VoiceMsgSubType": msg.VoiceMsgSubType, "Priority": msg.Priority, "ReturnReceiptRequested": msg.ReturnReceiptRequested ,"OkToFwd":"1", "Recipients": {"Recipient": {"MBID" : that.forwardExtension } }, "Attachments": msg.Attachments} ;
			}
		}

		console.log("CXMessageSendRequest:" + msgdata.valueOf() );

		that.client.CXIf.CXIf.CXProcessXML( {"XMLRequestData": {"CXMessageSend": msgdata  } }, 
												(function(err, result, body){callback(err, result, body, that);})
											  )
	}
}

function soapCXMessageSendResponseCallBack(err, result, body, that) 
{
	if(err){
		that.err = err;
		that.result = result;
		var callback = that.listFunctions.pop();
		that.listFunctions.push(callback);
		callback(that);
	}
	else{
		console.log(result);
		console.log('Message Sent (' + that.SendType +')');

		that.response = result.XMLResponse[0].CXResponse;
		var callback = that.listFunctions.shift();
		callback(that);
	}
}

////////////////////////////////////////////////////
//
////////////////////////////////////////////////////

//Get VoiceMail information
function requestVoiceMailInformation(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMBGetRequestCallBack, soapCXMBGetResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
						that.res.json(200, {Mailbox: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}

//Get all Messages from the voicemail
function requestMessages(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMBGetRequestCallBack, soapCXMBGetResponseCallBack);
	that.listFunctions.push(soapCXMessageSearchRequestCallBack,soapCXMessageSearchResponseCallBack);
	that.listFunctions.push(soapCXMessageGetRequestCallBack, soapCXMessageGetResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;
				}
			}
			else{
				if(that.res && that.response){
					var msgs = [];

					if(that.MessageDetails && that.MessageDetails.length >0)
					{
						var avstmsgs = that.MessageDetails;
						var totalMsg = avstmsgs.length;
						var newMsg = 0;

						for(var i=0; i<totalMsg; i++) {
							var msg = that.MessageDetails[i].StoredMessage;
							if(msg.Read == 0) { newMsg++; }

							//Get Attachment filename
							var totalAttachments = msg.Message.Attachments ?  (("length" in msg.Message.Attachments ) ? msg.Message.Attachments.length : 1) : 0;
							var wavFile = "";

							if(totalAttachments >0)
							{
								if(totalAttachments >1) {
									for(var jA=0; jA<totalAttachments; jA++)
									{
										if( msg.Message.Attachments.Attachment.FileType == "4"){
											wavFile = msg.Message.Attachments.Attachment.FilePath;
										}
									}
								}
								else {
										if( msg.Message.Attachments.Attachment.FileType == "4")
										{
											wavFile = msg.Message.Attachments.Attachment.FilePath;
											wavFile = wavFile.replace(/\\/g,"/");
											wavFile = cfg.avst_server_protocol + "://" + cfg.avst_server + ":" + cfg.avst_server_port + wavFile;
										}
								}
							}




							//Get Message length
							var msgLength = msg.Message.TotalVoiceMsec ? (Number(msg.Message.TotalVoiceMsec) / 1000).toFixed(0) : 0;
							msgLength = (parseInt( msgLength / 3600 ) % 24) + ":" + padLeft( (parseInt( msgLength / 60 ) % 60), 2, '0') + ":" +  padLeft( (parseInt(msgLength % 60, 10)) , 2, '0');

							//Get Caller ID
							var callerID = msg.Message.Sender.PhoneNumber.toString();
							if(callerID == "[object Object]") {callerID ="Unknown";}
							callerID = cfg.external_prefix ? callerID.replace(new RegExp("^" + cfg.external_prefix), '') : callerID;

							//Get Caller Name
							var callerName = msg.Message.Sender.Name;
							if(msg.Message.Sender.MBID.toString() == "0000000") {callerName = "";}

							//Get Message Date
							var date = new Date(Date.parse(msg.Message.DeliveryTimestamp))
							var msgDate = (cfg.date_format) ? date.toFormat(cfg.date_format) : msg.Message.DeliveryTimestamp;

							var obj = {"Message": msg.Message.PermanentMsgID, "date": msgDate,"callerId": callerID, "callerName":callerName,"length": msgLength, "newMessage": msg.Read == 0 ? "New" : "Saved", "attachment": wavFile};
							msgs.push(obj);
						}

					}
					that.res.content = "application/json";
					that.res.send(msgs);

					console.log(msgs);
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}



//Get all New Messages from the voicemail
function requestNewMessagesTest(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMBGetRequestCallBack, soapCXMBGetResponseCallBack);
	that.listFunctions.push(soapCXMessageSearchRequestCallBack_New, soapCXMessageSearchResponseCallBack_New);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					var newMsg = 0;
					newMsg = Math.floor((Math.random()*11)); 

					var msgs = [];
					if(newMsg >0) {
						for(var i=0; i<newMsg; i++) {
							var dt = new Date();
							dt.setDate(dt.getDate() - Math.floor((Math.random()*10)));
							var msgId = Math.floor(Math.random()*100);

							var obj = {"Message": msgId, "Created": dt.toDateString(), "Status"  : 'New'};
							msgs.push(obj);
						}
					}

					that.res.json(200, {Messages: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}


//Update VoiceMail password
function requestPasswordUpdate(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMailboxPasswordChangeRequestCallBack, soapCXMailboxPasswordChangeResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					that.res.json(200, {Password: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}

//Get message
function requestGetMessage(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMessageGetRequestCallBack, soapCXMessageGetResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					that.res.json(200, {Message: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}

//Update a message
function requestUpdateMessage(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMessageUpdateRequestCallBack, soapCXMessageUpdateResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					that.res.json(200, {Message: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}

//Get message attachment
function requestMessageAttachment(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMessageRetrieveAttachmentsRequestCallBack, soapCXMessageRetrieveAttachmentsResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					that.res.json(200, {Attachments: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}


//Forward a Message to an other MailBox
function requestForwardMessage(that){
	that.listFunctions=[];
	that.listFunctions.push(soapCreateClient, soapSetClient);
	that.listFunctions.push(soapCXLogonRequestCallBack, soapCXLogonResponseCallBack);
	that.listFunctions.push(soapCXMessageGetRequestCallBack, soapCXMessageGetResponseCallBack);
	that.listFunctions.push(soapCXMessageSendRequestCallBack, soapCXMessageSendResponseCallBack);
	that.listFunctions.push(soapCXLogoffRequestCallBack, soapCXLogoffResponseCallBack);
	that.listFunctions.push(function(that) {
			if(that.err){
				console.log(that.err);

				if(that.res) {
					that.res.send(that.err.toString());
					that.res=null;	
				}
			}
			else{
				if(that.res && that.response){
					that.res.json(200, {Attachments: that.response});
				}
				
				console.log(that.status);
			}
		});

	var callback = that.listFunctions.shift();
	callback(that);
}

////////////////////////////////////////////////////////
// Routing fucntions
////////////////////////////////////////////////////////
function getVoiceMailInformation(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);
	
	console.log("Incoming Request: getVoiceMailInformation()");

	requestVoiceMailInformation(that);
}

function getMessages(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);

	console.log("Incoming Request: GetMessages()");

	requestMessages(that);
	//requestMessagesTest(that);
}

function getNewMessages(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);

	console.log("Incoming Request: getNewMessages()");
	
	requestNewMessages(that);
}

function updatePassword(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);

	that.newPassword = that.req.params.newpassword;

	console.log("Incoming Request: updatePassword()");
	console.log("NewPassword: " + that.newPassword);
 
	requestPasswordUpdate(that);
}

function getMessageById(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);
	that.messageid = that.req.params.messageid;

	console.log("Request: getMessageById()");
	console.log("MessageId: " + that.messageid);
 
	requestGetMessage(that);
}

function updateMessageById(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);

	that.messageid = that.req.params.messageid;
	that.updateaction = that.req.params.updateaction;
	that.updatevalue = that.req.params.updatevalue;

	that.storedmessage={};
	that.storedmessage[that.req.params.updateaction] = that.req.params.updatevalue;

	console.log("Request: updateMessageById()");
	console.log("MessageId: " + that.messageid);
	console.log("UpdateAction: " + that.updateaction);

	requestUpdateMessage(that);
}


function getMessageAttachmentById(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);
	
	that.messageid = that.req.params.messageid;

	console.log("Request: getMessageAttachmentById()");
	console.log("MessageId: " + that.messageid);

	requestMessageAttachment(that);
}



function forwardMessageById(req, res, next) {
	var that = {};
	getBasicInformation(that, req, res, next);
	
	that.messageid = that.req.params.messageid;
	that.forwardExtension = that.req.params.forwardExtension;
	that.SendType="New";

	console.log("Request: forwardMessageById()");
	console.log("Forward Extension: " + that.forwardExtension);

	requestForwardMessage(that);
}


//Fill 'that' with all the basic info
function getBasicInformation(that, req, res, next)
{
	that.req= req;
	that.res = res;
	that.next = next;
	that.soapUrl = 'http://127.0.0.1:' + cfg.service_port + cfg.service_url_path;
	//that.endpoint = 'http://' + that.req.params.ip + ':18276';

	that.ip = that.req.params.ip;
	that.user = that.req.params.user;
	that.password = that.req.params.password;

	that.MessagesID = [];
	that.MessageDetails = [];
}


function getWsdl(req, res, next) {
	fs.readFile('./' + cfg.wsdl_file, function(error, content) {
		if (error) {
			res.writeHead(500);
			res.end();
		}
		else {
			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.end(content, 'utf-8');
		}
	});
}





function requestMessagesTest(that){
	if(that.res){
		var totalMsg = Math.floor((Math.random()*10)+1);
		var newMsg = Math.floor((Math.random()*(totalMsg+1)));

		var msgs = [];
		var dt = new Date();

		if(newMsg >0) {
			for(var i=0; i<newMsg; i++) {
				dt = new Date(dt);
				dt.setDate(dt.getDate() - Math.floor((Math.random()*10)));
				dt.setTime(dt.getTime() + (Math.floor((Math.random()*10))*60*60*1000)); 

				var msgId = Math.floor(Math.random()*100);
				var callerId = 1000 + Math.floor(Math.random()*9000);
				var callerName = (Math.floor(Math.random()*2) > 0) ? "Caller " + callerId : "";
				var length = Math.floor(Math.random()*1000);


				//var textDate = dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDay() + " " + dt.getHours() + ":" + dt.getMinutes();
				var textDate = dt.toFormat("YYYY/MM/DD HH24:MI");
				var obj = {"Message": msgId, "date": textDate, "callerId": callerId, "callerName":callerName,"length": length + "s", "newMessage":"New"};
				msgs.push(obj);
			}
		}

		if(totalMsg>0 && totalMsg>newMsg){
			for(var i=newMsg; i<totalMsg; i++) {
				dt = new Date(dt);
				dt.setDate(dt.getDate() - Math.floor((Math.random()*10)));
				dt.setTime(dt.getTime() + (Math.floor((Math.random()*10))*60*60*1000)); 

				var msgId = Math.floor(Math.random()*100);
				var callerId = 1000 + Math.floor(Math.random()*9000);
				var callerName = (Math.floor(Math.random()*2) > 0) ? "Caller " + callerId : "";
				var length = Math.floor(Math.random()*1000);

				var textDate = dt.toFormat("YYYY/MM/DD HH24:MI"); // dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDay() + " " + dt.getHours() + ":" + dt.getMinutes();
				var obj = {"Message": msgId, "date": textDate, "callerId": callerId, "callerName":callerName,"length": length + "s", "newMessage":"Saved"};
				msgs.push(obj);
			}

		}
		that.res.content = "application/json";
		//that.res.send({"Messages":msgs});
		that.res.send(msgs);
			
	}

	console.log(msgs);
}


////////////////////////////////////////////////////////
//
////////////////////////////////////////////////////////
function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

////////////////////////////////////////////////////////
// Routing declaration
////////////////////////////////////////////////////////

var server = restify.createServer();
server.get('/AVST/wsdl', getWsdl);
server.get('/AVST/VoiceMail/:ip/User/:user/:password', getVoiceMailInformation);
server.post('/AVST/VoiceMail/:ip/User/:user/:password/:newpassword', updatePassword);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages', getMessages);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages/:messageid', getMessageById);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages/New', getNewMessages);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages/:messageid/Attachment', getMessageAttachmentById);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages/:messageid/Forward/:forwardExtension', forwardMessageById);

//updateaction:  Folder (Saved or New), Read (1/0 to set/clear), Deleted ( 1 to delete the message), SoftDeleted (1/0 to set/clear the soft deleted)
server.post('/AVST/VoiceMail/:ip/User/:user/:password/Messages/:messageid/Update/:updateaction/:updatevalue', updateMessageById);
server.get('/AVST/VoiceMail/:ip/User/:user/:password/Messages/:messageid/Update/:updateaction/:updatevalue', updateMessageById);



//To Shutdown the server
server.get('/prepareForShutdown', function(req, res) {
  if( req.connection.remoteAddress == "127.0.0.1" || req.socket.remoteAddress == "127.0.0.1" || req.connection.socket.remoteAddress == "127.0.0.1" ) {
      managePreparationForShutdown(function() {
      res.statusCode = 200;
      res.end();
    });
  } else {
    res.statusCode = 500;
    res.end();
  }
});
 
var managePreparationForShutdown = function(callback) {
  // perform all the cleanup and other operations needed prior to shutdown,
  // but do not actually shutdown. Call the callback function only when
  // these operations are actually complete.
};


server.listen(cfg.service_port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
