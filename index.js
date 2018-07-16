const sdk = VoxImplant.getInstance();
let currentCall;
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('#callingBlock').style.display = 'none';
  document.querySelector('#answerBlock').style.display = 'none';
  document.querySelector('#inCallBlock').style.display = 'none';
  document.querySelector('#progressingBlock').style.display = 'none';
  document.querySelector('#vox_local_video').style.display = 'none';
  document.querySelector('#vox_remote_video').style.display = 'none';

  setLocalVideoBtn(false);
  Array.from(document.querySelectorAll('.js__hideLocalVideo')).forEach(el => {
    el.addEventListener('click',_=>{
      sdk.showLocalVideo(false);
      setLocalVideoBtn(false);
    },false)
  });
  Array.from(document.querySelectorAll('.js__showLocalVideo')).forEach(el => {
    el.addEventListener('click',_=>{
      sdk.showLocalVideo(true);
      setLocalVideoBtn(true);
    },false)
  });

  document.querySelector('#enableSendVideo').addEventListener('click',()=>{
    currentCall.sendVideo(true);
    showSendVideoButtons(true);
  },false);

  document.querySelector('#disableSendVideo').addEventListener('click',()=>{
    currentCall.sendVideo(false);
    showSendVideoButtons(false);
  },false);

  document.querySelector('#doCall').addEventListener('click',()=>{
    const sendVideo = document.querySelector('#enableSendVideoOnOffer').checked;
    currentCall = sdk.call(document.querySelector('#number').value,{
      sendVideo:sendVideo,
      receiveVideo: true
    });
    showSendVideoButtons(sendVideo);
    document.querySelector('#progressingBlock').style.display = 'block';
    document.querySelector('#callingBlock').style.display = 'none';
    bindCurrentCall();
  },false);

  document.querySelector('#hangup').addEventListener('click',()=>{
    currentCall.hangup();
    document.querySelector('#callingBlock').style.display = 'block';
    document.querySelector('#inCallBlock').style.display = 'none';
  });
  document.querySelector('#decline').addEventListener('click',()=>{
    currentCall.decline();
    document.querySelector('#callingBlock').style.display = 'block';
    document.querySelector('#answerBlock').style.display = 'none';
  });
  document.querySelector('#answer').addEventListener('click',()=>{
    const sendVideo = document.querySelector('#enableSendVideoOnAnswer').checked;
    currentCall.answer('',{},{
      sendVideo:sendVideo,
      receiveVideo: true
    });
    showSendVideoButtons(sendVideo);
    document.querySelector('#answerBlock').style.display = 'none';
  });

  document.querySelector('#doLogin').addEventListener('click',()=>{
    document.querySelector('#doLogin').style.display = 'none';
    sdk.init({showDebugInfo:true,localVideoContainerId:"vox_local_video",remoteVideoContainerId:"vox_remote_video"})
      .then(()=>sdk.connect(false))
      .then(()=>sdk.login(document.querySelector('#login').value,document.querySelector('#password').value))
      .then(()=>{
        document.querySelector('#callingBlock').style.display = 'block';
        document.querySelector('#authBlock').style.display = 'none';
        document.querySelector('#vox_local_video').style.display = 'block';
        document.querySelector('#vox_remote_video').style.display = 'block';
        sdk.on(VoxImplant.Events.IncomingCall,(e)=>{
          currentCall = e.call;
          document.querySelector('#callingBlock').style.display = 'none';
          document.querySelector('#answerBlock').style.display = 'block';
          bindCurrentCall();
        })
      })
      .catch(e=>{
        document.querySelector('#doLogin').style.display = 'inline';
        alert(e.code||e.name);
        sdk.disconnect();
      })
  })
},false);

function setLocalVideoBtn(flag) {
  Array.from(document.querySelectorAll('.js__hideLocalVideo')).forEach(el => {
    el.style.display = flag?'inline':'none'
  });
  Array.from(document.querySelectorAll('.js__showLocalVideo')).forEach(el => {
    el.style.display = flag?'none':'inline'
  });
}

function bindCurrentCall() {
  currentCall.on(VoxImplant.CallEvents.Failed,(e)=>{
    alert(e.reason||e.name);
    document.querySelector('#callingBlock').style.display = 'block';
    document.querySelector('#inCallBlock').style.display = 'none';
    document.querySelector('#answerBlock').style.display = 'none';
    document.querySelector('#progressingBlock').style.display = 'none';
    currentCall = null;
  });
  currentCall.on(VoxImplant.CallEvents.Disconnected,(e)=>{
    document.querySelector('#callingBlock').style.display = 'block';
    document.querySelector('#inCallBlock').style.display = 'none';
    document.querySelector('#answerBlock').style.display = 'none';
    document.querySelector('#progressingBlock').style.display = 'none';
    currentCall = null;
  });
  currentCall.on(VoxImplant.CallEvents.Connected,(e)=>{
    document.querySelector('#inCallBlock').style.display = 'block';
    document.querySelector('#progressingBlock').style.display = 'none';
  });
}

function showSendVideoButtons(flag) {
  document.querySelector('#enableSendVideo').style.display = flag?'none':'inline';
  document.querySelector('#disableSendVideo').style.display = flag?'inline':'none';
}