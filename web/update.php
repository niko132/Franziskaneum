<?php
	if (isset($_POST['token']) && !empty($_POST['token'])) {		
		$db_connection = pg_connect("host=ec2-54-75-227-92.eu-west-1.compute.amazonaws.com dbname=d7i5315uupgr2m user=mydxnmvauddyee password=493c42d4734c867c3fda62972ff79b1df2994deea5af051b3b1a4052e89f0381");
		
		$old_token = $_POST['old_token'];
		$is_teacher = $_POST['is_teacher'];
		$school_class = $POST['school_class'];
		$school_class_index = $POST['school_class_index'];
		$teacher_shortcut = $POST['teacher_shortcut'];
		$courses = $POST['courses'];
		
		$result = pg_query($db_connection, "SELECT token FROM users WHERE token = '" . $old_token . "'");
		$num_rows = pg_num_rows($result);
		
		if (!empty($old_token) && num_rows >= 1) {
			// update existing row with new token
		} else {
			$result = pg_query($db_connection, "SELECT token FROM users WHERE token = '" . $token . "'");
			$num_rows = pg_num_rows($result);
			
			if ($num_rows >= 1) {
				// update 
			} else {
				$fields = 'token';
				$values = '' . $token;
				
				if (!empty($is_teacher)) {
					$fields .= ', is_teacher';
					$values .= ', ' . $is_teacher;
				}
				
				if (!empty($school_class)) {
					$fields .= ', school_class';
					$values .= ', ' . $school_class;
				}
				
				if (!empty($school_class_index)) {
					$fields .= ', school_class_index';
					$values .= ', ' . $school_class_index;
				}
				
				if (!empty($teacher_shortcut)) {
					$fields .= ', teacher_shortcut';
					$values .= ', ' . $teacher_shortcut;
				}
				
				if (!empty($courses)) {
					$fields .= ', courses';
					$values .= ', ' . $courses;
				}
				
				echo $fields;
				echo '     ';
				echo $values;
			}
		}
	}
?>