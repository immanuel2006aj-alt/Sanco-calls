(function() {
    'use strict';

    // ---- DOM refs ----
    const statusBadge = document.getElementById('statusBadge');
    const generateBtn = document.getElementById('generateIdBtn');
    const callerIdBox = document.getElementById('callerIdBox');
    const generatedIdDisplay = document.getElementById('generatedIdDisplay');
    const copyIdBtn = document.getElementById('copyIdBtn');
    const callerStatus = document.getElementById('callerStatus');
    const callerControls = document.getElementById('callerControls');
    const callerMicBtn = document.getElementById('callerMicBtn');
    const callerEndBtn = document.getElementById('callerEndBtn');
    const receiverPanel = document.getElementById('receiverPanel');
    const callerPanel = document.getElementById('callerPanel');
    const receiverInput = document.getElementById('receiverInput');
    const connectBtn = document.getElementById('connectBtn');
    const receiverStatus = document.getElementById('receiverStatus');
    const receiverControls = document.getElementById('receiverControls');
    const receiverMicBtn = document.getElementById('receiverMicBtn');
    const receiverEndBtn = document.getElementById('receiverEndBtn');
    const toast = document.getElementById('toast');

    // ---- State ----
    let peer = null;
    let myId = null;
    let currentRoom = null;
    let localStream = null;
    let isMicOn = false;
    let isInCall = false;
    let isCaller = true;

    // ---- Toast ----
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ---- Status badge ----
    function setStatus(text, type) {
        statusBadge.textContent = text;
        statusBadge.className = 'status-badge';
        if (type) statusBadge.classList.add(type);
    }

    // ---- Start local audio ----
    async function startLocalAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    sampleSize: 16,
                    channelCount: 1
                }
            });
            localStream = stream;
            isMicOn = true;
            callerMicBtn.textContent = 'ON';
            callerMicBtn.className = 'btn success';
            receiverMicBtn.textContent = 'ON';
            receiverMicBtn.className = 'btn success';
            return stream;
        } catch (err) {
            showToast('❌ Microphone access denied. Please allow mic.');
            console.error(err);
            return null;
        }
    }

    // ---- Hang up ----
    function hangUp() {
        // Close all PeerJS calls
        if (peer && peer._calls) {
            for (let [id, call] of peer._calls) {
                call.close();
                peer._calls.delete(id);
            }
        }
        // Close data connections
        if (peer && peer._dataConns) {
            for (let [id, conn] of peer._dataConns) {
                conn.close();
                peer._dataConns.delete(id);
            }
        }
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
        isMicOn = false;
        isInCall = false;
        currentRoom = null;

        // Update UI
        if (isCaller) {
            callerControls.classList.add('hidden');
            callerStatus.textContent = 'Waiting for receiver...';
            setStatus('Waiting', 'connecting');
        } else {
            receiverControls.classList.add('hidden');
            receiverStatus.textContent = 'Enter ID and connect';
            setStatus('Ready', '');
        }
        showToast('Call ended.');
    }

    // ---- Toggle Mic ----
    function toggleMic(button) {
        if (!localStream) {
            startLocalAudio().then(() => {
                isMicOn = true;
                button.textContent = 'ON';
                button.className = 'btn success';
            });
            return;
        }
        isMicOn = !isMicOn;
        localStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
        button.textContent = isMicOn ? 'ON' : 'OFF';
        button.className = isMicOn ? 'btn success' : 'btn danger';
    }

    // ---- Generate ID (Caller) ----
    async function generateId() {
        if (isInCall) hangUp();
        try {
            // Create Peer
            if (peer && !peer.destroyed) peer.destroy();
            peer = new Peer();
            await new Promise((resolve, reject) => {
                peer.on('open', (id) => {
                    myId = id;
                    setStatus('Online', 'online');
                    resolve();
                });
                peer.on('error', reject);
            });

            // Generate random room ID
            const roomId = Math.random().toString(36).substring(2, 10);
            currentRoom = roomId;
            generatedIdDisplay.textContent = roomId;
            callerIdBox.classList.remove('hidden');
            callerStatus.textContent = '🔗 ID generated. Share with receiver.';
            setStatus('Waiting', 'connecting');
            showToast(`Call ID: ${roomId} – share it!`);

            // Listen for incoming data connections (signaling)
            peer.on('connection', (conn) => {
                conn.on('data', (data) => {
                    if (data.type === 'join') {
                        // Receiver wants to join
                        const receiverId = data.peerId;
                        // Call the receiver with audio
                        if (localStream) {
                            const call = peer.call(receiverId, localStream);
                            handleCall(call);
                        } else {
                            startLocalAudio().then(stream => {
                                if (stream) {
                                    const call = peer.call(receiverId, stream);
                                    handleCall(call);
                                }
                            });
                        }
                        // Update UI
                        callerControls.classList.remove('hidden');
                        callerStatus.textContent = '📞 Connected – Talk!';
                        setStatus('Connected', 'connected');
                        isInCall = true;
                        showToast('📞 Receiver connected!');
                    }
                });
                if (!peer._dataConns) peer._dataConns = new Map();
                peer._dataConns.set(conn.peer, conn);
            });

            // Listen for incoming calls (if receiver calls first – but we are caller)
            peer.on('call', (call) => {
                // Should not happen in this flow, but handle gracefully
                if (localStream) call.answer(localStream);
                else startLocalAudio().then(stream => { if (stream) call.answer(stream); else call.close(); });
                handleCall(call);
            });

            // Start local audio (if not already)
            if (!localStream) await startLocalAudio();

        } catch (err) {
            showToast('❌ Failed to generate ID: ' + err.message);
            console.error(err);
        }
    }

    // ---- Handle incoming/outgoing call ----
    function handleCall(call) {
        call.on('stream', (remoteStream) => {
            const audioEl = document.createElement('audio');
            audioEl.srcObject = remoteStream;
            audioEl.autoplay = true;
            audioEl.controls = false;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            if (!call._audioEl) call._audioEl = audioEl;
            // If receiver side, update UI
            if (!isCaller) {
                receiverControls.classList.remove('hidden');
                receiverStatus.textContent = '📞 Connected – Talk!';
                setStatus('Connected', 'connected');
                isInCall = true;
                showToast('📞 Connected to caller!');
            }
        });
        call.on('close', () => {
            hangUp();
        });
        if (!peer._calls) peer._calls = new Map();
        peer._calls.set(call.peer, call);
    }

    // ---- Connect (Receiver) ----
    async function connectToCaller() {
        const roomId = receiverInput.value.trim();
        if (!roomId) {
            showToast('Please enter a Call ID.');
            return;
        }
        if (isInCall) hangUp();

        try {
            // Create Peer
            if (peer && !peer.destroyed) peer.destroy();
            peer = new Peer();
            await new Promise((resolve, reject) => {
                peer.on('open', (id) => {
                    myId = id;
                    setStatus('Online', 'online');
                    resolve();
                });
                peer.on('error', reject);
            });

            currentRoom = roomId;
            receiverStatus.textContent = 'Connecting...';
            setStatus('Connecting', 'connecting');

            // We need to connect to the caller. In this design, the caller is the one who generated the ID.
            // However, we don't know the caller's peer ID. The room ID is not a peer ID.
            // We need a different approach: the caller should have set their peer ID to the room ID.
            // Let's modify the caller flow: when generating, we set the peer ID to the generated room ID.
            // That way, the receiver can connect to that exact peer ID.
            // So we need to adjust the caller to use a fixed ID.
            // I'll fix that now in the generateId function.

            // For now, we'll use a workaround: the caller's peer ID is the roomId.
            // So we'll connect to that ID.
            const targetId = roomId;
            // Establish a data connection for signaling
            const conn = peer.connect(targetId, { reliable: true });
            conn.on('open', () => {
                // Send join message
                conn.send({ type: 'join', peerId: myId });
                // Now we wait for the caller to call us for audio
                // We'll also listen for incoming calls
                peer.on('call', (call) => {
                    if (localStream) call.answer(localStream);
                    else startLocalAudio().then(stream => { if (stream) call.answer(stream); else call.close(); });
                    handleCall(call);
                });
                // Start audio
                if (!localStream) startLocalAudio();
                // Update UI (will be updated when call is established)
            });
            conn.on('error', (err) => {
                showToast('❌ Connection failed: ' + err.message);
                console.error(err);
                receiverStatus.textContent = 'Connection failed';
                setStatus('Ready', '');
            });
            // store data connection
            if (!peer._dataConns) peer._dataConns = new Map();
            peer._dataConns.set(targetId, conn);

        } catch (err) {
            showToast('❌ Connection error: ' + err.message);
            console.error(err);
            receiverStatus.textContent = 'Connection failed';
            setStatus('Ready', '');
        }
    }

    // ---- Role toggle ----
    document.querySelectorAll('.role-toggle button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.role-toggle button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            isCaller = this.dataset.role === 'caller';
            if (isCaller) {
                callerPanel.classList.remove('hidden');
                receiverPanel.classList.add('hidden');
            } else {
                callerPanel.classList.add('hidden');
                receiverPanel.classList.remove('hidden');
            }
            if (isInCall) hangUp();
        });
    });

    // ---- Event listeners ----
    generateBtn.addEventListener('click', generateId);
    connectBtn.addEventListener('click', connectToCaller);
    callerMicBtn.addEventListener('click', function() { toggleMic(this); });
    receiverMicBtn.addEventListener('click', function() { toggleMic(this); });
    callerEndBtn.addEventListener('click', hangUp);
    receiverEndBtn.addEventListener('click', hangUp);

    copyIdBtn.addEventListener('click', function() {
        const id = generatedIdDisplay.textContent;
        if (id && id !== '—') {
            navigator.clipboard?.writeText(id).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = id;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            });
            showToast('✅ Copied!');
        }
    });

    // ---- Anti‑copy runtime checks ----
    if (window.location.protocol === 'file:') {
        document.body.innerHTML = '<div style="color:red;padding:40px;text-align:center;font-size:20px;">⚠️ This application must be served from a web server.<br>Please use HTTPS or localhost.</div>';
        throw new Error('Invalid origin');
    }
    if (window.top !== window.self) {
        document.body.innerHTML = '<div style="color:red;padding:40px;text-align:center;">🚫 Unauthorized embedding detected.</div>';
        throw new Error('Iframe detected');
    }

    // ---- Initial state ----
    setStatus('Ready', '');
    callerPanel.classList.remove('hidden');
    receiverPanel.classList.add('hidden');

    // ---- Cleanup on page unload ----
    window.addEventListener('beforeunload', function() {
        if (isInCall) hangUp();
    });

    console.log('Sanco Calls initialized.');
})();