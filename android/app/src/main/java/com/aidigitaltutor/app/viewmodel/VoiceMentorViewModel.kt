package com.aidigitaltutor.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aidigitaltutor.app.data.*
import com.aidigitaltutor.app.repository.TutorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class TutorMode {
    CHAT, DEBUGGER, NOTES, INTERVIEW
}

data class UiState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val isListening: Boolean = false,
    val currentMode: TutorMode = TutorMode.CHAT,
    val error: String? = null,
    val isBackendAvailable: Boolean = true
)

@HiltViewModel
class VoiceMentorViewModel @Inject constructor(
    private val repository: TutorRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        checkBackendHealth()
    }

    private fun checkBackendHealth() {
        viewModelScope.launch {
            val result = repository.checkHealth()
            if (result is ApiResult.Error) {
                _uiState.value = _uiState.value.copy(
                    isBackendAvailable = false,
                    error = "Cannot connect to server. Check local backend status."
                )
            }
        }
    }

    fun setMode(mode: TutorMode) {
        _uiState.value = _uiState.value.copy(currentMode = mode, messages = emptyList(), error = null)
    }

    fun setListening(listening: Boolean) {
        _uiState.value = _uiState.value.copy(isListening = listening)
    }

    fun addMessage(message: ChatMessage) {
        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + message
        )
    }

    fun sendMessage(text: String, code: String = "", errorMsg: String = "") {
        val userMessage = ChatMessage("user", text)
        addMessage(userMessage)
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = when (_uiState.value.currentMode) {
                TutorMode.CHAT -> repository.getChatResponse(text, _uiState.value.messages)
                TutorMode.DEBUGGER -> repository.getDebugResponse(code, errorMsg)
                TutorMode.NOTES -> repository.getNotesResponse(text)
                TutorMode.INTERVIEW -> repository.getInterviewResponse(_uiState.value.messages, text)
            }

            when (result) {
                is ApiResult.Success -> {
                    val responseContent = when (val data = result.data) {
                        is ChatResponse -> data.reply
                        is DebugResponse -> data.analysis
                        is NotesResponse -> data.notes
                        is InterviewResponse -> data.question // For interview, showing the question
                        else -> "Unknown response type"
                    }
                    addMessage(ChatMessage("ai", responseContent))
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(error = result.message)
                }
                else -> {}
            }
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }
    
    fun clearChat() {
        _uiState.value = _uiState.value.copy(messages = emptyList(), error = null)
    }
}
