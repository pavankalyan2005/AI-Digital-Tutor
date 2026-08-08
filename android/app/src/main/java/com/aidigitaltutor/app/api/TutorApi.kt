package com.aidigitaltutor.app.api

import com.aidigitaltutor.app.data.*
import retrofit2.http.Body
import retrofit2.http.POST

interface TutorApi {
    @POST("api/ai/chat")
    suspend fun getChatResponse(@Body request: ChatRequest): ChatResponse

    @POST("api/ai/debug")
    suspend fun getDebugResponse(@Body request: DebugRequest): DebugResponse

    @POST("api/ai/notes")
    suspend fun getNotesResponse(@Body request: NotesRequest): NotesResponse

    @POST("api/ai/interview")
    suspend fun getInterviewResponse(@Body request: InterviewRequest): InterviewResponse
}
