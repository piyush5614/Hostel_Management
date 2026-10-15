package com.tchostel.connect

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Analytics
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.getValue
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val Navy = Color(0xFF102A43)
private val Blue = Color(0xFF1976D2)
private val Background = Color(0xFFF5F7FB)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { HostelConnectApp(this) }
    }
}

private data class Session(val token: String, val name: String, val role: String)
private data class DashboardCard(val label: String, val value: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
private fun HostelConnectApp(context: Context) {
    var session by remember { mutableStateOf(loadSession(context)) }
    if (session == null) {
        LoginScreen { newSession ->
            saveSession(context, newSession)
            session = newSession
        }
    } else {
        MainShell(session!!, onLogout = {
            context.getSharedPreferences("hostel_connect", Context.MODE_PRIVATE).edit().clear().apply()
            session = null
        })
    }
}

@Composable
private fun LoginScreen(onLoggedIn: (Session) -> Unit) {
    val scope = rememberCoroutineScope()
    var identifier by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize().background(Background), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(Modifier.padding(28.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(Icons.Outlined.Home, null, tint = Blue, modifier = Modifier.size(44.dp))
                Text("Hostel Connect", color = Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Text("Secure access for your hostel community", color = Color.Gray)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(identifier, { identifier = it }, label = { Text("Issued ID or email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(password, { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                Button(
                    onClick = {
                        loading = true
                        error = null
                        scope.launch {
                            try {
                                onLoggedIn(login(identifier, password))
                            } catch (e: Exception) {
                                error = e.message ?: "Unable to sign in"
                            } finally {
                                loading = false
                            }
                        }
                    },
                    enabled = !loading && identifier.isNotBlank() && password.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                    else Text("Sign in", fontWeight = FontWeight.SemiBold)
                }
                Text("Use the credentials issued by your administrator.", color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainShell(session: Session, onLogout: () -> Unit) {
    var selected by rememberSaveable { mutableStateOf(0) }
    val tabs = listOf("Home", "People", "Events", "More")
    val icons = listOf(Icons.Outlined.Home, Icons.Outlined.People, Icons.Outlined.CalendarMonth, Icons.Outlined.Analytics)
    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Hostel Connect", fontWeight = FontWeight.Bold, color = Navy)
                        Text(session.role.replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = Color.Gray)
                    }
                },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Outlined.Notifications, "Notifications") }
                    IconButton(onClick = onLogout) { Icon(Icons.Outlined.Logout, "Sign out") }
                }
            )
        },
        bottomBar = {
            NavigationBar(Modifier.navigationBarsPadding()) {
                tabs.forEachIndexed { index, label ->
                    NavigationBarItem(selected == index, { selected = index }, icon = { Icon(icons[index], label) }, label = { Text(label) })
                }
            }
        }
    ) { padding ->
        when (selected) {
            0 -> DashboardScreen(session, padding)
            1 -> PlaceholderScreen("People", "Students and staff records")
            2 -> PlaceholderScreen("Events", "Events and registrations")
            else -> PlaceholderScreen("More", "Messages, maintenance, visitors, leave and settings")
        }
    }
}

@Composable
private fun DashboardScreen(session: Session, padding: PaddingValues) {
    val cards = listOf(
        DashboardCard("Students", "Live records", Icons.Outlined.People),
        DashboardCard("Staff", "Live records", Icons.Outlined.Person),
        DashboardCard("Attendance", "View today", Icons.Outlined.CalendarMonth),
        DashboardCard("Visitors", "Manage log", Icons.Outlined.Visibility)
    )
    Column(Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
        Text("Good to see you, ${session.name}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Navy)
        Text("Everything important, one calm view.", color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(22.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(14.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            items(cards) { card ->
                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(card.icon, null, tint = Blue, modifier = Modifier.size(28.dp))
                        Text(card.label, fontWeight = FontWeight.SemiBold, color = Navy)
                        Text(card.value, color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Navy)) {
            Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Lock, null, tint = Color.White, modifier = Modifier.size(28.dp))
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text("Your data is protected", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("Access is controlled by your issued account.", color = Color.White.copy(alpha = .75f), fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun PlaceholderScreen(title: String, subtitle: String) {
    Box(Modifier.fillMaxSize().background(Background), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(28.dp)) {
            Text(title, fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Navy)
            Text(subtitle, color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
            Text("Native module coming next", color = Blue, modifier = Modifier.padding(top = 18.dp))
        }
    }
}

private suspend fun login(identifier: String, password: String): Session = withContext(Dispatchers.IO) {
    val connection = (URL("${BuildConfig.API_BASE_URL}/api/auth/login").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 15_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("x-college-id", "college-default")
    }
    connection.outputStream.use { it.write(JSONObject().put("email", identifier.trim()).put("password", password).put("collegeId", "college-default").toString().toByteArray()) }
    val body = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream).bufferedReader().use { it.readText() }
    if (connection.responseCode !in 200..299) throw IllegalStateException(JSONObject(body).optString("error", "Invalid credentials"))
    val result = JSONObject(body)
    val user = result.getJSONObject("user")
    Session(result.getString("token"), user.optString("name", identifier), user.optString("role", "user"))
}

private fun saveSession(context: Context, session: Session) {
    context.getSharedPreferences("hostel_connect", Context.MODE_PRIVATE).edit()
        .putString("token", session.token).putString("name", session.name).putString("role", session.role).apply()
}

private fun loadSession(context: Context): Session? {
    val prefs = context.getSharedPreferences("hostel_connect", Context.MODE_PRIVATE)
    val token = prefs.getString("token", null) ?: return null
    return Session(token, prefs.getString("name", "User") ?: "User", prefs.getString("role", "user") ?: "user")
}
