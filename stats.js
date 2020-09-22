let statWs;

function initReporter() {
    statWs = new WebSocket('wss://irbisadm.dev/collect');
}

let onStatPlaybackError = function () {};

function callReporter(call,login,callNumber){
    const currentCall = call;
    currentCall.on(VoxImplant.CallEvents.Failed, (e) => {
        onStatPlaybackError = function(){};
        pendingEvents = [];
        if (currentCall.extSessionId) {
            reportEvent('disconnected','',e.reason || e.name);
        }
    });
    currentCall.on(VoxImplant.CallEvents.Disconnected, (e) => {
        onStatPlaybackError = function(){};
        pendingEvents = [];
        reportEvent('disconnected','',e.headers['X-Reason'] || 'client');
    });
    currentCall.on(VoxImplant.CallEvents.Connected, (e) => {
        currentCall.extSessionId = e.headers['X-Conf-Sess'];
        currentCall.extId = e.headers['X-Conf-Call'];
        reportEvent('connected','','');
        // SessionId,CallId,BrowserName,BrowserVersion,SDKVer

        statWs.send(JSON.stringify({
            cmd: 'call', data: [
                currentCall.extSessionId,
                currentCall.extId,
                navigator.vendor,
                navigator.userAgent,
                VoxImplant.version,
                login,
                'participant',
                callNumber
            ]
        }));
    });
    currentCall.on(VoxImplant.CallEvents.MessageReceived, (e) => {
        try{
            const data = JSON.parse(e.text);
            if(data&&data.type&&data.type==='RecorderEvent'){
                reportEvent(data.event,'','');
            }
        }catch (e) {

        }
    })

    currentCall.on('SDP', onSDP);
    currentCall.on(VoxImplant.CallEvents.EndpointAdded,(ev)=>{
        if(currentCall.extSessionId) {
            reportEvent('endpointAdded','',ev.endpoint.id);
        }
        ev.endpoint.on(VoxImplant.EndpointEvents.Removed, ()=>{
            reportEvent('endpointRemoved','',ev.endpoint.id);
        })
    });

    currentCall.on(VoxImplant.CallEvents.CallStatsReceived, sendStats);

    const reportEvent = (name,sdp,description)=>{
        if(statWs&&statWs.readyState===WebSocket.OPEN && currentCall.extSessionId){
            statWs.send(JSON.stringify({
                cmd: 'event', data: [
                    currentCall.extSessionId,
                    currentCall.extId,
                    name,
                    sdp,
                    description
                ]
            }));
        }
    }
    const reporter = {
        sendVideo: ()=>{
            reportEvent('startSendVideo','','');
        },
        stopSendVideo: ()=>{
            reportEvent('stopSendVideo','','');
        },
        hold: ()=>{
            reportEvent('hold','','');
        },
        unHold: ()=>{
            reportEvent('unhold','','');
        },
        shareScreen: (showLocal,replace)=>{
            reportEvent('shareScreen','',`showLocal:${showLocal}, replace:${replace}`);
        },
        stopSharingScreen: ()=>{
            reportEvent('stopSharingScreen','','');
        }
    }

    function sendStats(ev) {
        if (currentCall && currentCall.extSessionId && currentCall.extId) {
            const commandList = []
            commandList.push({
                cmd: 'stat', data: [
                    currentCall.extSessionId,
                    currentCall.extId,
                    ev.stats.audioBytesReceived,
                    ev.stats.audioBytesSent,
                    ev.stats.audioLoss.toFixed(6),
                    ev.stats.audioPacketsLost,
                    ev.stats.audioPacketsReceived,
                    ev.stats.audioPacketsSent,
                    ev.stats.availableOutgoingBitrate,
                    ev.stats.networkType,
                    ev.stats.remoteCandidateType,
                    ev.stats.rtt,
                    ev.stats.timestamp,
                    ev.stats.totalBytesReceived,
                    ev.stats.totalBytesSent,
                    ev.stats.totalLoss.toFixed(6),
                    ev.stats.totalPacketsLost,
                    ev.stats.totalPacketsReceived,
                    ev.stats.totalPacketsSent,
                    ev.stats.videoBytesReceived,
                    ev.stats.videoBytesSent,
                    ev.stats.videoLoss.toFixed(6),
                    ev.stats.videoPacketsLost,
                    ev.stats.videoPacketsReceived,
                    ev.stats.videoPacketsSent
                ]
            });
            ev.stats.localAudioStats.forEach((st, id) => {
                commandList.push({
                    cmd: 'statLocalAudio', data: [
                        currentCall.extSessionId,
                        currentCall.extId,
                        id,
                        st.audioLevel,
                        st.bytesSent,
                        st.codec,
                        st.packetsSent,
                        st.timestamp
                    ]
                });
            });
            ev.stats.localVideoStats.forEach((st, id) => {
                commandList.push({
                    cmd: 'statLocalVideo', data: [
                        currentCall.extSessionId,
                        currentCall.extId,
                        st.bytesSent,
                        st.codec,
                        st.encoderBitrate,
                        st.fps,
                        st.frameHeight,
                        st.frameWidth,
                        st.packetsSent,
                        st.targetBitrate,
                        st.timestamp,
                        id,
                        st.pli,
                        st.fir,
                        st.nack,
                        st.qualityLimitationReason,
                        st.qualityLimitationResolutionChanges,
                    ]
                });
            });
            ev.stats.endpointStats.forEach((st, id) => {
                commandList.push({
                    cmd: 'statEndpoint', data: [
                        currentCall.extSessionId,
                        currentCall.extId,
                        id,
                        st.audioBytesReceived,
                        st.audioPacketsLost,
                        st.audioPacketsReceived,
                        st.timestamp,
                        st.totalBytesReceived,
                        st.totalPacketsReceived,
                        st.videoBytesReceived,
                        st.videoPacketsLost,
                        st.videoPacketsReceived
                    ]
                });
                for (let key in st.remoteAudioStats) {
                    if (st.remoteAudioStats.hasOwnProperty(key)) {
                        commandList.push({
                            cmd: 'statRemoteAudio', data: [
                                currentCall.extSessionId,
                                currentCall.extId,
                                id,
                                st.remoteAudioStats[key].bytesReceived,
                                st.remoteAudioStats[key].codec,
                                st.remoteAudioStats[key].jitterBufferMs,
                                st.remoteAudioStats[key].loss.toFixed(6),
                                st.remoteAudioStats[key].packetsLost,
                                st.remoteAudioStats[key].packetsReceived,
                                st.remoteAudioStats[key].timestamp,
                                key
                            ]
                        });
                    }
                }
                for (let key in st.remoteVideoStats) {
                    if (st.remoteVideoStats.hasOwnProperty(key)) {
                        commandList.push({
                            cmd: 'statRemoteVideo', data: [
                                currentCall.extSessionId,
                                currentCall.extId,
                                id,
                                st.remoteVideoStats[key].bytesReceived,
                                st.remoteVideoStats[key].codec,
                                st.remoteVideoStats[key].frameHeight,
                                st.remoteVideoStats[key].frameWidth,
                                st.remoteVideoStats[key].loss.toFixed(6),
                                st.remoteVideoStats[key].packetsLost,
                                st.remoteVideoStats[key].packetsReceived,
                                st.remoteVideoStats[key].timestamp,
                                key,
                                st.remoteVideoStats[key].framesDecoded,
                                st.remoteVideoStats[key].framesDropped,
                                st.remoteVideoStats[key].framesReceived
                            ]
                        });
                    }
                }

            })
            statWs.send(JSON.stringify({
                cmd:'statBatch',
                data: commandList
            }))
        }
    }


    let pendingEvents = [];
    function onSDP(e) {
        if(!currentCall.extSessionId){
            pendingEvents.push(e)
        } else{
            if(pendingEvents.length){
                pendingEvents.forEach(sendSDPEvent);
                pendingEvents = [];
            }
            sendSDPEvent(e);
        }
    }

    function getEventNameByOrigin(origin,{type}) {
        if(origin == 'getLocalOffer')
            return 'connectOffer';
        if(origin == 'processRemoteAnswer')
            return 'connectAnswer';
        if(origin == 'handleReinvite')
            return type==='offer'?'reInviteRemoteOffer':'reInviteLocalAnswer';
        if(origin == 'handleReinviteInProgress')
            return type==='offer'?'reInviteLocalOffer':'reInviteRemoteAnswer';
    }

    onStatPlaybackError = (ev) => {
        reportEvent('playbackError','',ev.message);
    }

    function sendSDPEvent(e) {

    }
  return reporter;
}