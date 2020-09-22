const sdk = VoxImplant.getInstance();
let currentCall;

let callNumber;
let login;
let statReporter;

document.addEventListener('DOMContentLoaded', () => {
  initReporter();
  updateViewState();
  setLocalVideoBtn(false);

  // Add event listener for disable local video preview
  Array.from(document.querySelectorAll('.js__hideLocalVideo')).forEach(el => {
    el.addEventListener('click', _ => {
      sdk.showLocalVideo(false);
      setLocalVideoBtn(false);
    }, false)
  });
  // Add event listener for enable local video preview
  Array.from(document.querySelectorAll('.js__showLocalVideo')).forEach(el => {
    el.addEventListener('click', _ => {
      sdk.showLocalVideo(true);
      setLocalVideoBtn(true);
    }, false)
  });

  // Start sending video
  document.querySelector('#enableSendVideo').addEventListener('click', () => {
    statReporter.sendVideo()

    currentCall.sendVideo(true);
    showSendVideoButtons(true);
  }, false);
  // Stop sending video
  document.querySelector('#disableSendVideo').addEventListener('click', () => {
    statReporter.stopSendVideo()
    currentCall.sendVideo(false);
    showSendVideoButtons(false);
  }, false);
  // Stop sending video
  document.querySelector('#stopSendVideo').addEventListener('click', () => {
    statReporter.stopSendVideo()
    currentCall.sendVideo(false);
    showSendVideoButtons(false);
  }, false);

  // Unhold call
  document.querySelector('#unhold').addEventListener('click', () => {
    statReporter.hold();
    currentCall.setActive(true);
    showHoldButtons(true);
  }, false);
  // Hold call
  document.querySelector('#hold').addEventListener('click', () => {
    statReporter.unHold();
    currentCall.setActive(false);
    showHoldButtons(false);
  }, false);


  // Create new outgoing call
  document.querySelector('#doCall').addEventListener('click', () => {
    const sendVideo = document.querySelector('#enableSendVideoOnOffer').checked;
    currentCall = sdk.call({
      number: document.querySelector('#number').value,
      video: {
        sendVideo: sendVideo,
        receiveVideo: true
      },
      //H264first: true
    });
    showSendVideoButtons(sendVideo);
    showHoldButtons(true);
    updateViewState('CALLING');
    bindCurrentCall();
  }, false);

  // Create new outgoing audio call
  document.querySelector('#doAudioCall').addEventListener('click', () => {
    const sendVideo = document.querySelector('#enableSendVideoOnOffer').checked;
    currentCall = sdk.call(document.querySelector('#number').value, {
      sendVideo: sendVideo,
      receiveVideo: false
    });
    showSendVideoButtons(sendVideo);
    showHoldButtons(true);
    updateViewState('CALLING');
    bindCurrentCall();
  }, false);

  // Create new outgoing conf call
  document.querySelector('#doCallConference').addEventListener('click', () => {
    const sendVideo = document.querySelector('#enableSendVideoOnOffer').checked;
    callNumber = document.querySelector('#number').value
    currentCall = sdk.callConference({
      number: callNumber,
      video: {
        sendVideo: sendVideo,
        receiveVideo: true
      },
      H264first: true
    });
    showSendVideoButtons(sendVideo);
    showHoldButtons(true);
    updateViewState('CALLING');
    bindCurrentCall();
  }, false);

  // Hangup current active call
  document.querySelector('#hangup').addEventListener('click', () => {
    currentCall.hangup();
    updateViewState('READY');
  });
  // Decline current incoming call
  document.querySelector('#decline').addEventListener('click', () => {
    currentCall.decline();
    updateViewState('READY');
  });
  // Answer incoming call
  document.querySelector('#answer').addEventListener('click', () => {
    const sendVideo = document.querySelector('#enableSendVideoOnAnswer').checked;
    currentCall.answer('', {}, {
      sendVideo: sendVideo,
      receiveVideo: true
    });
    showSendVideoButtons(sendVideo);
    showHoldButtons(true);
  });
  // Answer incoming call audio only
  document.querySelector('#answerAudio').addEventListener('click', () => {
    const sendVideo = document.querySelector('#enableSendVideoOnAnswer').checked;
    currentCall.answer('', {}, {
      sendVideo: sendVideo,
      receiveVideo: false
    });
    showSendVideoButtons(sendVideo);
    showHoldButtons(true);
  });

  // Login to the voximplant cloud
  document.querySelector('#doLogin').addEventListener('click', () => {
    document.querySelector('#doLogin').style.display = 'none';
    sdk.init({
      showDebugInfo: true,
      // prettyPrint: true,
      localVideoContainerId: "vox_local_video",
      remoteVideoContainerId: "vox_remote_video",
      rtcStatsCollectionInterval: "2000",
      // H264first:true,
      // serverIp:'dev146.voximplant.internal:4443'
      // serverIp:'dev146.voximplant.internal:4443'
      // serverIp:'dev165.voximplant.internal:4443'
    })
      .then(() => sdk.connect())
      .then(() => {
        login = document.querySelector('#login').value;
        sdk.login(login, document.querySelector('#password').value);
      })
      .then(() => {
        VoxImplant.Hardware.AudioDeviceManager.get().setDefaultAudioSettings({
          advanced: [{googEchoCancellation: {exact: true}}, {googExperimentalEchoCancellation: {exact: true}}, {autoGainControl: {exact: true}}, {noiseSuppression: {exact: true}}, {googHighpassFilter: {exact: true}}, {googAudioMirroring: {exact: true}}]
        });
        updateViewState('READY');
        // Setup listener on new Incoming call
        sdk.on(VoxImplant.Events.PlaybackError, onStatPlaybackError)
        sdk.on(VoxImplant.Events.IncomingCall, (e) => {
          currentCall = e.call;
          updateViewState('INCOMING');
          bindCurrentCall();
        })
      })
      .catch(e => {
        document.querySelector('#doLogin').style.display = 'inline';
        alert(e.code || e.name);
        console.error(e);
        sdk.disconnect();
      })
  })
}, false);



function setLocalVideoBtn(flag) {
  Array.from(document.querySelectorAll('.js__hideLocalVideo')).forEach(el => {
    el.style.display = flag ? 'inline' : 'none'
  });
  Array.from(document.querySelectorAll('.js__showLocalVideo')).forEach(el => {
    el.style.display = flag ? 'none' : 'inline'
  });
}

// Bind event to the current call
function bindCurrentCall() {
  statReporter = callReporter(currentCall,login,callNumber);
  currentCall.on(VoxImplant.CallEvents.Failed, (e) => {
    alert(e.reason || e.name);
    updateViewState('READY');
    currentCall = null;
  });
  currentCall.on(VoxImplant.CallEvents.Disconnected, (e) => {
    pendingEvents = [];
    updateViewState('READY');
    currentCall = null;
  });
  currentCall.on(VoxImplant.CallEvents.Connected, (e) => {
    updateViewState('INCALL');
  });
}

function showSendVideoButtons(flag) {
  document.querySelector('#enableSendVideo').style.display = flag ? 'none' : 'inline';
  document.querySelector('#disableSendVideo').style.display = flag ? 'inline' : 'none';
  document.querySelector('#stopSendVideo').style.display = flag ? 'none' : 'inline';
}

function showHoldButtons(flag) {
  document.querySelector('#unhold').style.display = flag ? 'none' : 'inline';
  document.querySelector('#hold').style.display = flag ? 'inline' : 'none';
}

// This function change view state.
function updateViewState(state) {
  switch (state) {
    case 'READY':
      document.querySelector('#callingBlock').style.display = 'block';
      document.querySelector('#authBlock').style.display = 'none';
      document.querySelector('#answerBlock').style.display = 'none';
      document.querySelector('#inCallBlock').style.display = 'none';
      document.querySelector('#progressingBlock').style.display = 'none';
      document.querySelector('#vox_local_video').style.display = 'block';
      document.querySelector('#vox_remote_video').style.display = 'block';
      break;
    case 'CALLING':
      document.querySelector('#authBlock').style.display = 'none';
      document.querySelector('#callingBlock').style.display = 'block';
      document.querySelector('#answerBlock').style.display = 'none';
      document.querySelector('#inCallBlock').style.display = 'none';
      document.querySelector('#progressingBlock').style.display = 'none';
      document.querySelector('#vox_local_video').style.display = 'block';
      document.querySelector('#vox_remote_video').style.display = 'block';
      break;
    case 'INCOMING':
      document.querySelector('#authBlock').style.display = 'none';
      document.querySelector('#callingBlock').style.display = 'none';
      document.querySelector('#answerBlock').style.display = 'block';
      document.querySelector('#inCallBlock').style.display = 'none';
      document.querySelector('#progressingBlock').style.display = 'none';
      document.querySelector('#vox_local_video').style.display = 'block';
      document.querySelector('#vox_remote_video').style.display = 'block';
      break;
    case 'INCALL':
      document.querySelector('#authBlock').style.display = 'none';
      document.querySelector('#callingBlock').style.display = 'none';
      document.querySelector('#answerBlock').style.display = 'none';
      document.querySelector('#inCallBlock').style.display = 'block';
      document.querySelector('#progressingBlock').style.display = 'none';
      document.querySelector('#vox_local_video').style.display = 'block';
      document.querySelector('#vox_remote_video').style.display = 'block';
      break;
    default:
      document.querySelector('#authBlock').style.display = 'block';
      document.querySelector('#callingBlock').style.display = 'none';
      document.querySelector('#answerBlock').style.display = 'none';
      document.querySelector('#inCallBlock').style.display = 'none';
      document.querySelector('#progressingBlock').style.display = 'none';
      document.querySelector('#vox_local_video').style.display = 'none';
      document.querySelector('#vox_remote_video').style.display = 'none';
      break;
  }
}