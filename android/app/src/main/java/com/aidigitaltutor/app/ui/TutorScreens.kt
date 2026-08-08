package com.aidigitaltutor.app.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aidigitaltutor.app.data.ChatMessage
import com.aidigitaltutor.app.viewmodel.TutorMode
import com.aidigitaltutor.app.viewmodel.UiState
import com.aidigitaltutor.app.viewmodel.VoiceMentorViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import java.util.Locale

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun TutorApp(viewModel: VoiceMentorViewModel, voiceManager: com.aidigitaltutor.app.utils.VoiceManager) {
    val uiState by viewModel.uiState.collectAsState()
    val recordAudioPermissionState = rememberPermissionState(android.Manifest.permission.RECORD_AUDIO)
    var codeInput by remember { mutableStateOf("") }
    var errorInput by remember { mutableStateOf("") }
    
    // Auto-speak AI messages
    LaunchedEffect(uiState.messages) {
        val lastMessage = uiState.messages.lastOrNull()
        if (lastMessage?.role == "ai") {
            voiceManager.speak(lastMessage.content)
        }
    }

    Scaffold(
        topBar = { 
            CenterAlignedTopAppBar(
                title = { Text("AI Digital Tutor") },
                actions = {
                    IconButton(onClick = { viewModel.clearChat() }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear Chat")
                    }
                }
            ) 
        },
        bottomBar = { ModeSelector(uiState.currentMode) { viewModel.setMode(it) } },
        floatingActionButton = {
            MicButton(uiState.isListening) {
                if (recordAudioPermissionState.status.isGranted) {
                    if (uiState.isListening) {
                        voiceManager.stopListening()
                    } else {
                        if (uiState.currentMode == TutorMode.DEBUGGER) {
                            viewModel.sendMessage("Debug this code", codeInput, errorInput)
                        } else {
                            voiceManager.startListening()
                        }
                    }
                } else {
                    recordAudioPermissionState.launchPermissionRequest()
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (!uiState.isBackendAvailable) {
                Surface(
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Backend Server Offline",
                        color = Color.White,
                        modifier = Modifier.padding(8.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            if (uiState.error != null) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth()) {
                    Text(uiState.error!!, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(8.dp))
                }
            }

            if (uiState.currentMode == TutorMode.DEBUGGER) {
                OutlinedTextField(
                    value = codeInput,
                    onValueChange = { codeInput = it },
                    label = { Text("Paste Code") },
                    modifier = Modifier.fillMaxWidth().height(150.dp).padding(8.dp)
                )
                OutlinedTextField(
                    value = errorInput,
                    onValueChange = { errorInput = it },
                    label = { Text("Error Message") },
                    modifier = Modifier.fillMaxWidth().padding(8.dp)
                )
            }
            
            ChatList(uiState.messages, Modifier.weight(1f))
            
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
fun ChatList(messages: List<ChatMessage>, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp)) {
        items(messages) { message ->
            ChatBubble(message)
        }
    }
}

@Composable
fun ChatBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Surface(
            color = if (isUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
            shape = RoundedCornerShape(12.dp)
        ) {
            Box(modifier = Modifier.padding(12.dp)) {
                if (isUser) {
                    Text(text = message.content)
                } else {
                    Text(text = message.content)
                }
            }
        }
    }
}

@Composable
fun MicButton(isListening: Boolean, onClick: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition()
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.3f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800),
            repeatMode = RepeatMode.Reverse
        )
    )

    FloatingActionButton(
        onClick = onClick,
        modifier = Modifier.scale(scale),
        containerColor = if (isListening) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
        shape = CircleShape
    ) {
        Icon(if (isListening) Icons.Default.Stop else Icons.Default.Mic, contentDescription = null)
    }
}

@Composable
fun ModeSelector(currentMode: TutorMode, onModeChange: (TutorMode) -> Unit) {
    NavigationBar {
        TutorMode.values().forEach { mode ->
            NavigationBarItem(
                selected = currentMode == mode,
                onClick = { onModeChange(mode) },
                icon = { Icon(Icons.Default.Mic, contentDescription = null) }, // Placeholder icons
                label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }, fontSize = 10.sp) }
            )
        }
    }
}
