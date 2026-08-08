package com.aidigitaltutor.app.repository

import com.aidigitaltutor.app.api.ApiService
import com.aidigitaltutor.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TutorRepository @Inject constructor(
    private val apiService: ApiService
) {

    private suspend fun <T> safeApiCall(call: suspend () -> Response<T>): ApiResult<T> {
        return withContext(Dispatchers.IO) {
            try {
                val response = call()
                if (response.isSuccessful) {
                    response.body()?.let {
                        ApiResult.Success(it)
                    } ?: ApiResult.Error("Empty response body")
                } else {
                    ApiResult.Error("API Error: ${response.message()}", response.code())
                }
            } catch (e: Exception) {
                ApiResult.Error("Connection Error: ${e.localizedMessage ?: "Check if server is running"}")
            }
        }
    }

    suspend fun checkHealth() = safeApiCall { apiService.checkHealth() }

    suspend fun login(credentials: Map<String, String>) = safeApiCall { apiService.login(credentials) }

    suspend fun signup(credentials: Map<String, String>) = safeApiCall { apiService.signup(credentials) }

    suspend fun getChatResponse(prompt: String, history: List<ChatMessage>) = 
        safeApiCall { apiService.getChatResponse(ChatRequest(prompt, history)) }

    suspend fun getDebugResponse(code: String, error: String) = 
        safeApiCall { apiService.getDebugResponse(DebugRequest(code, error)) }

    suspend fun getNotesResponse(topic: String) = 
        safeApiCall { apiService.getNotesResponse(NotesRequest(topic)) }

    suspend fun getInterviewResponse(history: List<ChatMessage>, nextPrompt: String) = 
        safeApiCall { apiService.getInterviewResponse(InterviewRequest(history, nextPrompt)) }

    suspend fun getCourses() = safeApiCall { apiService.getCourses() }

    suspend fun getUserStats() = safeApiCall { apiService.getUserStats() }

    suspend fun getRoadmap(skill: String) = safeApiCall { apiService.getRoadmap(skill) }

    suspend fun getGoals() = safeApiCall { apiService.getGoals() }

    suspend fun addGoal(goal: GoalRequest) = safeApiCall { apiService.addGoal(goal) }

    suspend fun updateGoal(id: Int, completed: Boolean) = 
        safeApiCall { apiService.updateGoal(id, mapOf("completed" to if (completed) 1 else 0)) }

    suspend fun deleteGoal(id: Int) = safeApiCall { apiService.deleteGoal(id) }
}
