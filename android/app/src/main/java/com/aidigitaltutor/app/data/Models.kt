package com.aidigitaltutor.app.data

import com.google.gson.annotations.SerializedName

// Generic Result Wrapper
sealed class ApiResult<out T> {
    data class Success<out T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
    object Loading : ApiResult<Nothing>()
}

// Authentication
data class AuthResponse(
    val token: String,
    val user: User
)

data class User(
    val id: String,
    val email: String,
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("onboarding_completed") val onboardingCompleted: Int,
    @SerializedName("assessment_completed") val assessmentCompleted: Int
)

// AI Services
data class ChatMessage(
    val role: String, // "user" or "ai"
    val content: String
)

data class ChatRequest(
    val prompt: String,
    val history: List<ChatMessage> = emptyList()
)

data class ChatResponse(
    val reply: String
)

data class DebugRequest(
    val code: String,
    val error: String
)

data class DebugResponse(
    val analysis: String
)

data class NotesRequest(
    val topic: String
)

data class NotesResponse(
    val notes: String
)

data class InterviewRequest(
    val chatHistory: List<ChatMessage> = emptyList(),
    val nextTurnPrompt: String = ""
)

data class InterviewResponse(
    val question: String,
    val suggestions: List<String>,
    val feedback: String? = null
)

// Courses
data class Course(
    val id: String,
    val title: String,
    val description: String,
    val skill: String,
    val thumbnail: String,
    @SerializedName("image_url") val imageUrl: String?,
    @SerializedName("modules_count") val modulesCount: Int
)

// Learning Roadmap
data class RoadmapResponse(
    val title: String,
    val description: String,
    val weeks: List<RoadmapWeek>
)

data class RoadmapWeek(
    val week: Int,
    val topic: String,
    val detail: String,
    val steps: List<String>
)

// Goals
data class Goal(
    val id: Int,
    @SerializedName("goal_text") val goalText: String,
    @SerializedName("target_date") val targetDate: String,
    val completed: Int
)

data class GoalRequest(
    @SerializedName("goal_text") val goalText: String,
    @SerializedName("target_date") val targetDate: String
)

// Skill Categories
data class SkillCategory(
    val id: String,
    val name: String,
    val icon: String, // Icon name or resource string
    val courseCount: Int,
    val color: String // Hex color or primary/secondary indicator
)

// Stats
data class Stats(
    val points: Int,
    @SerializedName("current_level") val currentLevel: Int,
    @SerializedName("streak_days") val streakDays: Int,
    @SerializedName("total_submissions") val totalSubmissions: Int,
    @SerializedName("successful_submissions") val successfulSubmissions: Int,
    @SerializedName("completed_modules_count") val completedModulesCount: Int
)
