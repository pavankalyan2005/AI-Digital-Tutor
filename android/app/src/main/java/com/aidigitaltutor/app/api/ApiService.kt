package com.aidigitaltutor.app.api

import com.aidigitaltutor.app.data.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Health Check
    @GET("/")
    suspend fun checkHealth(): Response<Unit>

    // Authentication
    @POST("api/auth/signup")
    suspend fun signup(@Body credentials: Map<String, String>): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body credentials: Map<String, String>): Response<AuthResponse>

    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<User>

    // AI Services
    @POST("api/ai/chat")
    suspend fun getChatResponse(@Body request: ChatRequest): Response<ChatResponse>

    @POST("api/ai/debug")
    suspend fun getDebugResponse(@Body request: DebugRequest): Response<DebugResponse>

    @POST("api/ai/notes")
    suspend fun getNotesResponse(@Body request: NotesRequest): Response<NotesResponse>

    @POST("api/ai/interview")
    suspend fun getInterviewResponse(@Body request: InterviewRequest): Response<InterviewResponse>

    // Courses & Stats
    @GET("api/courses")
    suspend fun getCourses(): Response<List<Course>>

    @GET("api/stats/progress")
    suspend fun getUserStats(): Response<Stats>

    // Learning Roadmaps
    @GET("api/roadmaps/{skill}")
    suspend fun getRoadmap(@Path("skill") skill: String): Response<RoadmapResponse>

    // User Goals
    @GET("api/goals")
    suspend fun getGoals(): Response<List<Goal>>

    @POST("api/goals")
    suspend fun addGoal(@Body goal: GoalRequest): Response<Goal>

    @PUT("api/goals/{id}")
    suspend fun updateGoal(@Path("id") id: Int, @Body data: Map<String, Int>): Response<Map<String, Boolean>>

    @DELETE("api/goals/{id}")
    suspend fun deleteGoal(@Path("id") id: Int): Response<Map<String, Boolean>>
}
