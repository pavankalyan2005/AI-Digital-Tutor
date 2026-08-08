package com.aidigitaltutor.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aidigitaltutor.app.data.Course
import com.aidigitaltutor.app.ui.components.FeatureBadge
import com.aidigitaltutor.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseDetailsScreen(
    courseId: String,
    onBackClick: () -> Unit
) {
    // Mock course data
    val course = Course(
        id = courseId,
        title = "Modern Android with Jetpack Compose",
        description = "Learn to build beautiful, responsive native Android apps using the latest tools and best practices from Google.",
        skill = "Mobile Dev",
        thumbnail = "",
        imageUrl = null,
        modulesCount = 12
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Course Details") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                FeatureBadge(text = course.skill)
            }

            item {
                Text(
                    text = "About this course",
                    style = MaterialTheme.typography.titleLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = course.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item {
                Text(
                    text = "Modules (${course.modulesCount})",
                    style = MaterialTheme.typography.titleLarge
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                // Mock modules list
                repeat(3) { index ->
                    ModuleItem(index + 1, "Module ${index + 1}: Introduction to Compose")
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }

            item {
                Button(
                    onClick = { /* Start Learning */ },
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Text("Enroll Now")
                }
            }
        }
    }
}

@Composable
fun ModuleItem(number: Int, title: String) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.PlayCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = "Step $number", style = MaterialTheme.typography.labelSmall)
                Text(text = title, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}
