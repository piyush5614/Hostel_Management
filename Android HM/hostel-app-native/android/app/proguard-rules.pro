# ProGuard configuration for the Android app

# Add any ProGuard rules here to prevent obfuscation of specific classes or methods
# For example, to keep all classes in the com.tchostel.app package:
-keep class com.tchostel.app.** { *; }

# If using Retrofit, keep the model classes
-keep class com.yourpackage.models.** { *; }

# If using Gson, keep the model classes
-keep class com.yourpackage.models.** { *; }
-keepattributes Signature
-keepattributes *Annotation

# Add any other rules as necessary for your project