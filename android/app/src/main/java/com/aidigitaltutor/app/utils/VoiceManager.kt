package com.aidigitaltutor.app.utils

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.*

class VoiceManager(
    private val context: Context,
    private val onResult: (String) -> Unit,
    private val onListeningState: (Boolean) -> Unit
) : RecognitionListener {

    private val speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
    private var tts: TextToSpeech? = null

    init {
        speechRecognizer.setRecognitionListener(this)
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US
            }
        }
    }

    fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
        }
        speechRecognizer.startListening(intent)
    }

    fun stopListening() {
        speechRecognizer.stopListening()
    }

    fun speak(text: String) {
        val cleanText = text.replace(Regex("[#*`]"), "")
        tts?.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, null)
    }

    override fun onReadyForSpeech(params: Bundle?) { onListeningState(true) }
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() { onListeningState(false) }
    override fun onError(error: Int) { onListeningState(false) }
    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            onResult(matches[0])
        }
    }
    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    fun destroy() {
        speechRecognizer.destroy()
        tts?.stop()
        tts?.shutdown()
    }
}
