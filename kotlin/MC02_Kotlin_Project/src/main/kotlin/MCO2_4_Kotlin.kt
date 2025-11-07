
import org.jetbrains.kotlinx.dataframe.api.dataFrameOf

fun main() {
    val df = dataFrameOf("name" to listOf("Alice", "Bob"), "age" to listOf(25, 30))
    println(df)

}