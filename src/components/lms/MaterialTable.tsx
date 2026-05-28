import { MoreHorizontal, Loader2, Pencil, Trash2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import CustomPagination from "@/components/global/CustomPagination";
import { useAuth } from "@/hooks/AuthProvider";
import Link from "next/link";

interface Props {
  data: any[];
  loading: boolean;
  onEdit: (material: any) => void;
  onDelete: (id: string) => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

export const MaterialTable = ({
  data,
  loading,
  onEdit,
  onDelete,
  page,
  setPage,
  totalPages,
}: Props) => {
  const { user } = useAuth();
  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Uploader</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No study materials found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((material) => (
              <TableRow key={material._id}>
                <TableCell className="font-medium">
                  <div>{material.title}</div>
                  {material.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {material.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{material.type}</Badge>
                </TableCell>
                <TableCell>{material.classId?.name || "N/A"}</TableCell>
                <TableCell>{material.subjectId?.name || "N/A"}</TableCell>
                <TableCell>{material.uploader?.name || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 items-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={material.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> View
                      </Link>
                    </Button>
                    {isAdminOrTeacher && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit(material)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 dark:hover:text-red-600 hover:text-red-600"
                            onClick={() => onDelete(material._id)}
                          >
                            <Trash2 className="mr-2 size-4 text-red-400 dark:hover:text-red-600 hover:text-red-600" />{" "}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data.length > 10 && (
        <CustomPagination
          loading={loading}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};
