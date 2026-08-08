package com.aidigitaltutor.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aidigitaltutor.app.data.SkillCategory
import com.aidigitaltutor.app.ui.components.FeatureBadge
import com.aidigitaltutor.app.ui.components.GlassCard
import com.aidigitaltutor.app.ui.components.GradientIcon

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SkillCategoriesScreen(
    onCategoryClick: (String) -> Unit
) {
    val categories = listOf(
        SkillCategory("1", "Programming", "code", 120, "#6366f1"),
        SkillCategory("2", "AI & ML", "psychology", 85, "#8b5cf6"),
        SkillCategory("3", "Web Dev", "language", 150, "#06b6d4"),
        SkillCategory("4", "Data Science", "bar_chart", 95, "#ec4899"),
        SkillCategory("5", "Mobile Dev", "smartphone", 70, "#f59e0b"),
        SkillCategory("6", "UI/UX Design", "palette", 45, "#10b981")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Explore Skills") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(padding)
        ) {
            items(categories) { category ->
                SkillCard(category = category, onClick = { onCategoryClick(category.id) })
            }
        }
    }
}

@Composable
fun SkillCard(
    category: SkillCategory,
    onClick: () -> Unit
) {
    val color = Color(android.graphics.Color.parseColor(category.color))
    
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        GradientIcon(
            icon = when(category.name) {
                "Programming" -> Icons.Default.Code
                "AI & ML" -> Icons.Default.AutoAwesome
                "Web Dev" -> Icons.Default.Language
                "Data Science" -> Icons.Default.BarChart
                "Mobile Dev" -> Icons.Default.Smartphone
                else -> Icons.Default.Palette
            },
            colors = listOf(color, color.copy(alpha = 0.6f))
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = category.name,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(4.dp))
        FeatureBadge(text = "${category.courseCount} Courses")
    }
}
