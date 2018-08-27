'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
// const cors = require('cors')({ origin: true });
admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

//****************** SHB 2018.08.25 6pm */ <

//on /lots write
exports.F00_reservationReports = functions.database.ref('/lots/{uid}').onWrite(event => {
  //get previous and new data
  //get server time +8

  const previousData = event.data.previous.val();
  const newData = event.data.val();

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2) + "T00:00";
  var serverDatePH = new Date(serverDatePH_String);

  var updatePathsAtOnce = {};

  if (previousData.reservationdetails) {
    if (previousData.reservationdetails.start) {
      var previousDataStart = new Date(previousData.reservationdetails.start);
      var previousDataStart_noTimeString = previousDataStart.getFullYear() + "-" + ("0" + (previousDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + previousDataStart.getDate()).slice(-2);
      var previousDataStart_noTimeDate = new Date(previousDataStart_noTimeString);
      var previousDataStart_Month = previousDataStart.getFullYear() + "-" + ("0" + (previousDataStart.getMonth() + 1)).slice(-2);
      var previousDataStart_Year = previousDataStart.getFullYear();
      var previousDataStart_Week = getWeekNumber(previousDataStart);


      var previousDataStatus = previousData.status;
      if (previousDataStatus) {
        if (previousDataStatus != 'notyetavailable' && previousDataStatus != 'available') {
          //daily
          admin.database().ref('/reports/activity/daily/' + previousDataStart_noTimeString + '/lotType/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
          admin.database().ref('/reports/activity/daily/' + previousDataStart_noTimeString + '/total' + jsUcfirst(previousDataStatus)).transaction(qty => qty = qty - 1).then(() => { });

          admin.database().ref('/reports/forUpdate20180825').push({
            date: previousDataStart_noTimeString,
            blocklot: event.params.uid,
            lottype: previousData.type,
            lotstatus: previousDataStatus,
            agentkey: previousData.reservationdetails.agent,
            agentdetails: previousData.reservationdetails.agentdetails,
            addorless: "less"
          });


          if (serverDatePH.getTime() === previousDataStart_noTimeDate.getTime()) {
            admin.database().ref('/reports/lotstatus/Today/' + previousData.type + '/' + previousDataStatus).transaction(qty => qty = qty - 1).then(() => { });
          }

          console.log('less:ok');
        }
      }


    }
  }


  if (newData.reservationdetails) {
    if (newData.reservationdetails.start) {
      var newDataStart = new Date(newData.reservationdetails.start);
      var newDataStart_noTimeString = newDataStart.getFullYear() + "-" + ("0" + (newDataStart.getMonth() + 1)).slice(-2) + "-" + ("0" + newDataStart.getDate()).slice(-2);
      var newDataStart_noTimeDate = new Date(newDataStart_noTimeString);
      var newDataStart_Month = newDataStart.getFullYear() + "-" + ("0" + (newDataStart.getMonth() + 1)).slice(-2);
      var newDataStart_Year = newDataStart.getFullYear();
      var newDataStart_Week = getWeekNumber(newDataStart);


      var newDataStatus = newData.status;
      if (newDataStatus) {
        if (newDataStatus != 'notyetavailable' && newDataStatus != 'available') {

          //daily
          admin.database().ref('/reports/activity/daily/' + newDataStart_noTimeString + '/lotType/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
          admin.database().ref('/reports/activity/daily/' + newDataStart_noTimeString + '/total' + jsUcfirst(newDataStatus)).transaction(qty => qty = qty + 1).then(() => { });

          admin.database().ref('/reports/forUpdate20180825').push({
            date: newDataStart_noTimeString,
            blocklot: event.params.uid,
            lottype: newData.type,
            lotstatus: newDataStatus,
            agentkey: newData.reservationdetails.agent,
            agentdetails: newData.reservationdetails.agentdetails,
            addorless: "add"
          });

          if (serverDatePH.getTime() === newDataStart_noTimeDate.getTime()) {
            admin.database().ref('/reports/lotstatus/Today/' + newData.type + '/' + newDataStatus).transaction(qty => qty = qty + 1).then(() => { });
          }
          console.log('add:ok');
        }
      }


    }
  }

  return null;

});

//schedule everyday from 8am to 12pm, every 5 minutes
exports.F01_updateReservationReports = functions.https.onRequest((req, res) => {
  //activity, comparative, & agent reports
  //weekly
  //monthly
  //yearly

  ref.child('reports/forUpdate20180825').limitToFirst(1).once('value').then(snapshot => {

    if (snapshot.exists()) {
      snapshot.forEach(element => {
        ref.child('agents/' + element.val().agentkey).once('value').then(_agent => {
          if (_agent.val()) {
            var _date = new Date(element.val().date);
            var _date_noTimeString = _date.getFullYear() + "-" + ("0" + (_date.getMonth() + 1)).slice(-2) + "-" + ("0" + _date.getDate()).slice(-2);
            var _date_noTimeDate = new Date(_date_noTimeString);
            var _date_Week = getWeekNumber(_date);
            var _date_Month = _date.getFullYear() + "-" + ("0" + (_date.getMonth() + 1)).slice(-2);
            var _date_Year = _date.getFullYear();

              var serverDateTime = new Date();
              var serverDateTimePH = new Date(serverDateTime);
              serverDateTimePH.setHours(serverDateTime.getHours() + 8);
              var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2) + "T00:00";
              var serverDatePH = new Date(serverDatePH_String);

            if (element.val().addorless == "add") {
              //weekly
              admin.database().ref('/reports/activity/weekly/' + _date_Week + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/activity/weekly/' + _date_Week + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });

              //monthly
              admin.database().ref('/reports/activity/monthly/' + _date_Month + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/activity/monthly/' + _date_Month + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });

              //yearly
              admin.database().ref('/reports/activity/yearly/' + _date_Year + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/activity/yearly/' + _date_Year + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });

              //comparative
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/daily/' + _date_noTimeString + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/weekly/' + _date_Week + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/monthly/' + _date_Month + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/yearly/' + _date_Year + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty + 1).then(() => { });

              //sales_agents
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });

              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });

              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });

              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });
              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty + 1).then(() => { });

              //update overall?
              if (serverDatePH.getTime() !== _date_noTimeDate.getTime()) {
                admin.database().ref('/reports/overAll/' + _date_noTimeString + '/lotType/' + _agent.val().type + '/' + element.val().lotstatus).transaction(val => val = Number(val) + 1).then(() => { });
                admin.database().ref('/reports/overAll/' + _date_noTimeString + '/overall/total' + jsUcfirst(element.val().lotstatus)).transaction(val => val = Number(val) + 1).then(() => { });
              }              

              //update to null
              admin.database().ref('/reports/forUpdate20180825/' + element.key).set(null);

              admin.database().ref('/reports/forUpdate20180825Logs/' + _date_noTimeString + '/' + element.key).set(element.val());

            }
            else if (element.val().addorless == "less") {
              //weekly
              admin.database().ref('/reports/activity/weekly/' + _date_Week + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/activity/weekly/' + _date_Week + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });

              //monthly
              admin.database().ref('/reports/activity/monthly/' + _date_Month + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/activity/monthly/' + _date_Month + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });

              //yearly
              admin.database().ref('/reports/activity/yearly/' + _date_Year + '/lotType/' + element.val().lottype + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/activity/yearly/' + _date_Year + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });

              //comparative
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/daily/' + _date_noTimeString + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/weekly/' + _date_Week + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/monthly/' + _date_Month + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/comparative/' + element.val().lottype + '/yearly/' + _date_Year + '/total' + jsUcfirst(element.val().lotstatus)).transaction(qty => qty = qty - 1).then(() => { });

              //sales_agents
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/daily/' + _date_noTimeString + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });

              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/weekly/' + _date_Week + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });

              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/monthly/' + _date_Month + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });

              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/agents/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().agentkey + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/groups/' + _agent.val().type + '/' + _agent.val().group + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });
              admin.database().ref('/reports/sales_agents/yearly/' + _date_Year + '/type/' + _agent.val().type + '/' + element.val().lotstatus).transaction(qty => qty = qty - 1).then(() => { });

              //update overall?
              if (serverDatePH.getTime() !== _date_noTimeDate.getTime()) {
                admin.database().ref('/reports/overAll/' + _date_noTimeString + '/lotType/' + _agent.val().type + '/' + element.val().lotstatus).transaction(val => val = Number(val) - 1).then(() => { });
                admin.database().ref('/reports/overAll/' + _date_noTimeString + '/overall/total' + jsUcfirst(element.val().lotstatus)).transaction(val => val = Number(val) - 1).then(() => { });
              } 

              //update to null
              admin.database().ref('/reports/forUpdate20180825/' + element.key).set(null);

              admin.database().ref('/reports/forUpdate20180825Logs/' + _date_noTimeString + '/' + element.key).set(element.val());
            }
            else {
              console.log("updateReservationReports:error:" + element.val().blocklot)
            }

          }
          else {
            console.log("updateReservationReports:error:agent does not exist:" + element.val().blocklot + ":" + element.val().agentkey)
          }


        });

      });

      res.status(200).send('updateReservationReports:ok');

    }
    else {
      res.status(200).send('updateReservationReports:empty');
    }

  }).catch(reason => {
    res.status(500).send('updateReservationReports error: ' + reason);
  });

  //** FOR TESTING 2018.08.26 1AM */
});

//schedule everyday, 12am and 12pm
exports.F02_fiveminuteReset = functions.https.onRequest((req, res) => {
  // var serverDateTime = new Date(admin.database.ServerValue.TIMESTAMP);
  var d1 = new Date();
  var xdate = new Date(d1);
  var sdate = new Date(d1);
  xdate.setHours(d1.getHours() - 168); //less 24hours
  sdate.setHours(d1.getHours() + 8); //manila +8 offset from UTC

  var computedStartDateTimeNow = xdate.getFullYear() + "-" + ("0" + (xdate.getMonth() + 1)).slice(-2) + "-" + ("0" + xdate.getDate()).slice(-2)
    + "T" + ("0" + (xdate.getHours())).slice(-2) + ":" + ("0" + xdate.getMinutes()).slice(-2);

  var computedDateTimeNow = sdate.getFullYear() + "-" + ("0" + (sdate.getMonth() + 1)).slice(-2) + "-" + ("0" + sdate.getDate()).slice(-2)
    + "T" + ("0" + (sdate.getHours())).slice(-2) + ":" + ("0" + sdate.getMinutes()).slice(-2);

  var computedDateToday = sdate.getFullYear() + "-" + ("0" + (sdate.getMonth() + 1)).slice(-2) + "-" + ("0" + sdate.getDate()).slice(-2);

  ref.child('lots').orderByChild('reservationdetails/expiry').startAt(computedStartDateTimeNow).endAt(computedDateTimeNow).once('value').then(snapshot => {

    if (snapshot.exists()) {

      getStatusColors().then(statusColors => {

        if (statusColors) {

          snapshot.forEach(element => {

            if (element.val().reservationdetails.expiry) {

              getNextReservation(element.key, element.val().reservation, element.val().reservationdetails.expiry).then(tokens => {

                var map_lot = 'block' + element.val().block + 'lot' + element.val().lot;
                getMapLotStatus(map_lot, element.val().level).then(mapLotStatus => {

                  var updatePathsAtOnce = {};
                  if (tokens) {
                    var keys = Object.keys(tokens);
                    var previousDate;
                    var key = '';

                    keys.forEach(ckey => {
                      //contain next
                      //check if next reservation is also expired
                      var kxdate = new Date(tokens[ckey].expiry);
                      if (tokens[ckey].expiry) {
                        if (kxdate > sdate) {
                          if (previousDate) {
                            if (kxdate < previousDate) {
                              //if current expiry date is greater than previous evaluated expiry
                              key = ckey;
                            }
                          }
                          else {
                            key = ckey;
                          }

                          previousDate = kxdate;
                        }
                      }
                    });

                    if (key) {
                      updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/iscurrent'] = false;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/isexpired'] = true;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + key + '/iscurrent'] = true;
                      updatePathsAtOnce['/reservations/' + element.key + '/' + key + '/isexpired'] = false;
                      tokens[key].iscurrent = true;
                      tokens[key].isxpired = false;
                      updatePathsAtOnce['/lots/' + element.key + '/reservation'] = key.toString();
                      updatePathsAtOnce['/lots/' + element.key + '/reservationdetails'] = tokens[key];
                      updatePathsAtOnce['/lots/' + element.key + '/status'] = tokens[key].type;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/bg_color'] = statusColors[tokens[key].type].bg_color;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/fore_color'] = statusColors[tokens[key].type].fore_color;
                      updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/status_name'] = statusColors[tokens[key].type].name;
                      updatePathsAtOnce['/lots/' + element.key + '/type_status_inventoriable'] = element.val().type + '_' + tokens[key].type + '_' + element.val().inventoriable;

                      var xarea = '';
                      if (element.val().area) xarea = element.val().area;

                      var xpart = '';
                      if (element.val().part) xpart = element.val().part;

                      updatePathsAtOnce['/reports/fiveminuteReset/' + computedDateToday + element.val().reservation] = {
                        lotkey: element.key,
                        area: xarea,
                        block: element.val().block,
                        designation: element.val().designation,
                        inventoriable: element.val().inventoriable,
                        level: element.val().level,
                        lot: element.val().lot,
                        part: xpart,
                        reservation: element.val().reservation,
                        reservationdetails: element.val().reservationdetails,
                        status: element.val().status,
                        type: element.val().type
                      };

                      //if have map_lot then update map_lot
                      if (mapLotStatus) {
                        updatePathsAtOnce['/lots/' + map_lot + '/status'] = mapLotStatus;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/bg_color'] = statusColors[mapLotStatus].bg_color;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/fore_color'] = statusColors[mapLotStatus].fore_color;
                        updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/status_name'] = statusColors[mapLotStatus].name;
                        updatePathsAtOnce['/lots/' + map_lot + '/type_status_inventoriable'] = element.val().type + '_' + mapLotStatus + '_' + 'no';
                      }
                    }

                  }
                  else {
                    //no next
                    updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/iscurrent'] = false;
                    updatePathsAtOnce['/reservations/' + element.key + '/' + element.val().reservation + '/isexpired'] = true;
                    updatePathsAtOnce['/lots/' + element.key + '/reservation'] = '';
                    updatePathsAtOnce['/lots/' + element.key + '/reservationdetails'] = '';
                    updatePathsAtOnce['/lots/' + element.key + '/status'] = 'available';
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/bg_color'] = statusColors['available'].bg_color;
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/fore_color'] = statusColors['available'].fore_color;
                    updatePathsAtOnce['/lots/' + element.key + '/maprenderdetails/status_name'] = statusColors['available'].name;
                    updatePathsAtOnce['/lots/' + element.key + '/type_status_inventoriable'] = element.val().type + '_' + 'available' + '_' + element.val().inventoriable;

                    var xarea = '';
                    if (element.val().area) xarea = element.val().area;

                    var xpart = '';
                    if (element.val().part) xpart = element.val().part;

                    updatePathsAtOnce['/reports/fiveminuteReset/' + computedDateToday + element.val().reservation] = {
                      lotkey: element.key,
                      area: xarea,
                      block: element.val().block,
                      designation: element.val().designation,
                      inventoriable: element.val().inventoriable,
                      level: element.val().level,
                      lot: element.val().lot,
                      part: xpart,
                      reservation: element.val().reservation,
                      reservationdetails: element.val().reservationdetails,
                      status: element.val().status,
                      type: element.val().type
                    };

                    //if have map_lot then update map_lot
                    if (mapLotStatus) {
                      updatePathsAtOnce['/lots/' + map_lot + '/status'] = mapLotStatus;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/bg_color'] = statusColors[mapLotStatus].bg_color;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/fore_color'] = statusColors[mapLotStatus].fore_color;
                      updatePathsAtOnce['/lots/' + map_lot + '/maprenderdetails/status_name'] = statusColors[mapLotStatus].name;
                      updatePathsAtOnce['/lots/' + map_lot + '/type_status_inventoriable'] = element.val().type + '_' + mapLotStatus + '_' + 'no';
                    }

                  }

                  ref.update(updatePathsAtOnce).then(function () {
                    console.log(element.key + ": Write completed")
                  }).catch(function (error) {
                    console.log(element.key + ':' + error)
                  });

                });

              });

            }

          });

          res.status(200).send('ok:' + snapshot.numChildren());

        }
        else {
          res.status(505).send('status colors not defined');
        }

      }).catch(reason => {
        res.status(505).send('fiveminuteReset error: ' + reason);
      });
    }
    else {
      res.status(200).send('snapshot null');
    }
    // res.status(200).send('total is ' + snapshot.numChildren());
  }).catch(reason => {
    res.status(505).send('fiveminuteReset error: ' + reason);
  });
});

//schedule everyday, 1:00am
exports.F10_getDailyRunningTotal_LawnLots_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/lawnlots/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/lawnlots/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_LawnLots20180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 1:30am
exports.F11_getDailyRunningTotal_WallNiche_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/wallniche/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/wallniche/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_wallniche20180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 2:00am
exports.F12_getDailyRunningTotal_BoneChamber_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/bonechamber/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/bonechamber/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_bonechamber20180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 2:30am
exports.F13_getDailyRunningTotal_Cinerarium_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/cinerarium/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/cinerarium/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_Cinerarium20180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 3:00am
exports.F14_getDailyRunningTotal_GardenLot1_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/gardenlots1/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots1/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_GardenLot120180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 3:12am
exports.F15_getDailyRunningTotal_GardenLot2_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/gardenlots2/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots2/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_GardenLot220180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 3:24am
exports.F16_getDailyRunningTotal_GardenLot3_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/gardenlots3/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots3/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_GardenLot320180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 3:36am
exports.F17_getDailyRunningTotal_GardenLot4_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/gardenlots4/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots4/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_GardenLot420180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 3:48am
exports.F18_getDailyRunningTotal_GardenLot5_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/gardenlots5/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/gardenlots5/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_GardenLot520180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 4:00am
exports.F19_getDailyRunningTotal_FamilyLot1_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/familylots1/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots1/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_FamilyLot120180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 4:12am
exports.F20_getDailyRunningTotal_FamilyLot2_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/familylots2/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots2/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_FamilyLot220180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 4:24am
exports.F21_getDailyRunningTotal_FamilyLot3_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/familylots3/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots3/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_FamilyLot320180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 4:36am
exports.F22_getDailyRunningTotal_FamilyLot4_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/familylots4/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots4/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_FamilyLot420180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 4:48am
exports.F23_getDailyRunningTotal_FamilyLot5_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);
  var totalHold = 0;
  var totalReserved = 0;
  var totalSold = 0;

  ref.child('reports/comparative/familylots5/yearly').once('value').then(snapshot => {

    if (snapshot.val()) {

      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/hold').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/reserved').transaction(qty => qty = 0).then(() => { });
      admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/sold').transaction(qty => qty = 0).then(() => { });

      snapshot.forEach(element => {
        var _totalHold = 0;
        var _totalReserved = 0;
        var _totalSold = 0;

        if(element.val().totalHold) _totalHold = element.val().totalHold;
        if(element.val().totalReserved) _totalReserved = element.val().totalReserved;
        if(element.val().totalSold) _totalSold = element.val().totalSold;

        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/hold').transaction(qty => qty = qty + _totalHold).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/reserved').transaction(qty => qty = qty + _totalReserved).then(() => { });
        admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/familylots5/sold').transaction(qty => qty = qty + _totalSold).then(() => { });

        console.log(element.val());
      });

    }

    console.log("getDailyRunningTotal_FamilyLot520180825:ok")

  })


  res.status(200).send('ok:getDailyRunningTotal20180825');

});

//schedule everyday, 5:00am
exports.F24_getDailyRunningTotal_Totals_20180825 = functions.https.onRequest((req, res) => {

  var serverDateTime = new Date();
  var serverDateTimePH = new Date(serverDateTime);
  serverDateTimePH.setHours(serverDateTime.getHours() + 8);
  serverDateTimePH.setDate(serverDateTimePH.getDate() - 1);
  var serverDatePH_String = serverDateTimePH.getFullYear() + "-" + ("0" + (serverDateTimePH.getMonth() + 1)).slice(-2) + "-" + ("0" + serverDateTimePH.getDate()).slice(-2);

  ref.child('/reports/overallTotalInventory/lotType').orderByChild('added').equalTo(false).once('value').then(snapshot => {

    if (snapshot.exists()) {

      snapshot.forEach(element => {

        var open = element.val().open;
        var notyetavailable = element.val().notyetavailable;

        ref.child('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key).once('value').then(snap => {

          if (snap.exists()) {
            var hold = 0;
            var reserved = 0;
            var sold = 0;

            if (snap.val().hold) hold = snap.val().hold;
            if (snap.val().reserved) reserved = snap.val().reserved;
            if (snap.val().sold) sold = snap.val().sold;

            var available = open - (hold + reserved + sold);

            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key + '/available').transaction(qty => qty = available).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/lotType/' + element.key + '/notyetavailable').transaction(qty => qty = notyetavailable).then(() => { });

            //overall total hold, reserved, sold
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalHold').transaction(qty => qty = qty + hold).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalReserved').transaction(qty => qty = qty + reserved).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalSold').transaction(qty => qty = qty + sold).then(() => { });

            //overall total available and not yet available
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalAvailable').transaction(qty => qty = qty + available).then(() => { });
            admin.database().ref('/reports/overAll/' + serverDatePH_String + '/overall/totalNotyetavailable').transaction(qty => qty = qty + notyetavailable).then(() => { });

            //update overallTotalInventory/lotType/[type]/added = true
            admin.database().ref('/reports/overallTotalInventory/lotType/' + element.key + '/added').transaction(v => v = true).then(() => { });
          }
        });
      });
    }

    res.status(200).send('ok:getDailyRunningTotal_Totals');

  });

});

//schedule everyday, 5:30am
exports.F25_reservationReportsReset = functions.https.onRequest((req, res) => {
  var updatePathsAtOnce = {};
  updatePathsAtOnce['/reports/lotstatus/Today'] = {
    bonechamber: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    cinerarium: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots1: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots2: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots3: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots4: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    familylots5: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots1: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots2: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots3: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots4: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    gardenlots5: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    lawnlots: {
      hold: 0,
      reserved: 0,
      sold: 0
    },
    wallniche: {
      hold: 0,
      reserved: 0,
      sold: 0
    }
  };

  //updatePathsAtOnce['/reports/forUpdate20180825'] = null;

  updatePathsAtOnce['/reports/overallTotalInventory/lotType/bonechamber/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/cinerarium/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/familylots1/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/familylots2/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/familylots3/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/familylots4/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/familylots5/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/gardenlots1/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/gardenlots2/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/gardenlots3/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/gardenlots4/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/gardenlots5/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/lawnlots/added'] = false;
  updatePathsAtOnce['/reports/overallTotalInventory/lotType/wallniche/added'] = false;

  ref.update(updatePathsAtOnce).then(function () {
    res.status(200).send("Write completed");
  }).catch(function (error) {
    res.status(200).send('error');
  });


});

//****************** SHB 2018.08.25 6pm */ />


const getWeekNumber = (d) => {
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var year = d.getUTCFullYear().toString().substring(2, 4);
  var week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  if (week < 10) { week = '0' + week };
  return year + 'w' + week;
};

const jsUcfirst = (xstring) => {
  return xstring.charAt(0).toUpperCase() + xstring.slice(1);
}

const getStatusColors = () => {
  return admin.database().ref('/statuscolor').once('value').then(snap => {
    return snap.val();
  });
}

const getNextReservation = (lotKey, currentReservationKey, currentServerDateTime) => {
  return admin.database().ref('/reservations/' + lotKey).orderByChild('start').startAt(currentServerDateTime).limitToFirst(2).once('value').then(snap => {
    return snap.val();
    //SHB note: will check later if the ff will matter:
    //01/01/2018 - Hold Expires
    //01/10/2018 - Reservation Starts
    //01/02 - 09,2018 - Available --- also as current date = 01/03/2018
  });
}

const getMapLotStatus = (mapLot, level) => {
  if (level) {
    return admin.database().ref('/lots').orderByChild('map_lot').equalTo(mapLot).limitToFirst(5).once('value').then(snap => {
      if (snap.exists()) {
        var winningValStat = 0;
        snap.forEach(element => {
          var valStat = 0;
          var stat = element.val().status;
          if (stat) {
            if (stat === 'available') valStat = 5;
            else if (stat === 'hold') valStat = 4;
            else if (stat === 'reserved') valStat = 3;
            else if (stat === 'soldlacking') valStat = 2;
            else if (stat === 'sold') valStat = 1;
            else valStat = 0; //notyetavailable
          }
          if (valStat > winningValStat) {
            winningValStat = valStat;
          }
        });

        if (winningValStat == 5) return Promise.resolve('available');
        else if (winningValStat == 4) return Promise.resolve('hold');
        else if (winningValStat == 3) return Promise.resolve('reserved');
        else if (winningValStat == 2) return Promise.resolve('soldlacking');
        else if (winningValStat == 1) return Promise.resolve('sold');
        else return Promise.resolve('notyetavailable');

      }
      else {
        return Promise.resolve('notyetavailable');
      }
    }).catch(function (error) {
      return Promise.resolve('notyetavailable');
    });
  }
  else {
    return Promise.resolve(null);
  }


}

