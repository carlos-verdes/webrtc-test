'use strict';

angular.module('webrtcTestApp')
  .controller('PlayingCtrl', function ($rootScope,$scope,$log,midiService,$http,$audioService,$synthService,$replayerService) {
    $scope.globalScore = 0;
    $log.info('Loading canvas controller');

    $scope.idUserCanvas='mainPlayerCanvas';
    $scope.idOtherUserCanvas='otherPlayerCanvas';
    $scope.idThirdUserCanvas='idThirdUserCanvas';
    //register all ids
    $scope.canvasIds=[$scope.idUserCanvas,$scope.idOtherUserCanvas,$scope.idThirdUserCanvas];

    $rootScope.$on('playmyband.webrtc.data.message.received',function(event, message){
      $log.debug('playing message received');
      var msgContent = JSON.parse(message.getContent());
      var eventName='user.note.event.'+ msgContent.playerId;
      $rootScope.broadcast(eventName, msgContent);
    });

    function getNoteFromKeyboard(event) {
      var keyID = (event.charCode) ? event.charCode : ((event.which) ? event.which : event.keyCode);
      var note = keyID - 49; // 49 = key 1
      return note;
    }

    function doKeyDown(event){
      var note = getNoteFromKeyboard(event);
      //$log.debug('onkeydown: ',event,note);
      if(note>=0 && note <=4){
        sendUserNote(note);
      } else if (note>=5 && note <=10){
        note= note-5;
        sendNote(note);
      }


    }

    function doKeyUp(event){
      var note = getNoteFromKeyboard(event);
      //$log.debug('onkeyup: ',event,note);
      if(note>=0 && note <=4){
        sendUserNoteRelease(note);
      }
    }

    function sendUserNote(note, canvasId){
      var accumulatedNoteDelta = window.performance.now() - $rootScope.playingStartTimestamp;      
      if ($rootScope.replayer.isANoteThere(note + 96,accumulatedNoteDelta, 100, 1))
      {
        $scope.globalScore = $scope.globalScore + 1;
        $scope.$digest();          
      }
      canvasId = canvasId || $scope.idUserCanvas;
      var userInputMsg = {data: {localPlayerId:$rootScope.localPlayerId, songURL:$rootScope.songURL, difficultyLevel:$rootScope.difficultyLevel}};
      $rootScope.telScaleWebRTCPhoneController.sendDataMessage('allContacts', JSON.stringify(userInputMsg));        
      var eventName='user.note.event.'+ canvasId;
      //$log.debug('sending user note to user canvas '+eventName);
      $rootScope.$broadcast(eventName,note);
    }

    function sendUserNoteRelease(note){
        var eventName='user.note.release.event.'+$scope.idUserCanvas;
        //$log.debug('sending release note to user canvas '+eventName);
        $rootScope.$broadcast(eventName,note);

    }

    function sendNote(noteEvent){
      var normalizedNote = noteEvent.event.noteNumber - $rootScope.difficultyLevel[0];
      noteEvent.event.noteNumber = normalizedNote;


      //if note track is between 1 and 3
      if(noteEvent.track>=1 && noteEvent.track<=3){
        var canvasIdIndex= noteEvent.track-1;
        var eventName='midi.note.event.'+$scope.canvasIds[canvasIdIndex];

        //send event
        $rootScope.$broadcast(eventName,noteEvent);        

      }

    }
    $rootScope.sendNote = sendNote;

    /* NOT USED
      function cancelEvent(e){
        e.stopPropagation();
        e.preventDefault();
      }
    */

    $scope.startDemo=function(){

    };        

    function playMidi() {
      $rootScope.synth = new $synthService.FretsSynth(44100);
      $rootScope.replayer = new $replayerService.Replayer($rootScope.midiFile, $rootScope.synth, $rootScope);
      $rootScope.audio = new $audioService.AudioPlayer($rootScope.replayer);
      

      //start the sound later, this must be sync with midi and note rendering
      setTimeout(function(){
        $rootScope.songAudio = new Audio('./assets/midi/PearlJamBetterMan/guitar.ogg');
        $rootScope.songAudio.play();
        $rootScope.playingStartTimestamp = window.performance.now();
        },$rootScope.secondsInAdvance * 1000);  
    }

    playMidi();




    // capture keyboard event
    window.addEventListener( 'keypress', doKeyDown, false );
    window.addEventListener( 'keyup', doKeyUp, false );

  });
