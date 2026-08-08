package com.aidigitaltutor.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "courses")
data class CachedCourse(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val skill: String,
    val thumbnail: String
)

@Database(entities = [CachedCourse::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "tutor_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
