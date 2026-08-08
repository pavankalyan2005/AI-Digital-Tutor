package com.aidigitaltutor.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.aidigitaltutor.app.ui.screens.AiTutorChatScreen
import com.aidigitaltutor.app.ui.screens.CourseDetailsScreen
import com.aidigitaltutor.app.ui.screens.SkillCategoriesScreen

sealed class Screen(val route: String) {
    object SkillCategories : Screen("skills")
    object CourseDetails : Screen("course/{courseId}") {
        fun createRoute(courseId: String) = "course/$courseId"
    }
    object AiTutorChat : Screen("ai_tutor")
}

@Composable
fun AppNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.SkillCategories.route
    ) {
        composable(Screen.SkillCategories.route) {
            SkillCategoriesScreen(
                onCategoryClick = { categoryId ->
                    // For demo, just navigate to a fixed course
                    navController.navigate(Screen.CourseDetails.createRoute(categoryId))
                }
            )
        }
        
        composable(Screen.CourseDetails.route) { backStackEntry ->
            val courseId = backStackEntry.arguments?.getString("courseId") ?: ""
            CourseDetailsScreen(
                courseId = courseId,
                onBackClick = { navController.popBackStack() }
            )
        }
        
        composable(Screen.AiTutorChat.route) {
            AiTutorChatScreen()
        }
    }
}
